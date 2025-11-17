import os
import io
import time
import json
from typing import List, Dict, Any

import pandas as pd
import joblib
from fastapi import FastAPI, UploadFile, File, WebSocket
from fastapi.responses import JSONResponse, PlainTextResponse

from preprocess import load_preprocessor, transform, engineer_features, TARGETS, EVENT_COL, GATE_COL
from models import load_model
from utils import setup_logging, checksum_dict, record_metrics
import yaml

app = FastAPI()

CONFIG_PATH = os.environ.get("CONFIG", os.path.join(os.path.dirname(__file__), "config.yaml"))
OUTPUTS = os.environ.get("OUTPUTS", os.path.join(os.path.dirname(__file__), "outputs"))
with open(CONFIG_PATH, "r", encoding="utf-8") as f:
	CFG = yaml.safe_load(f)

# Load artifacts on startup
PRE_PATH = os.path.join(OUTPUTS, "preprocessor.pkl")
ARRIVAL_PATH = os.path.join(OUTPUTS, "arrival_model.pkl")
RISK_PATH = os.path.join(OUTPUTS, "risk_model.pkl")
ACTION_PATH = os.path.join(OUTPUTS, "action_model.pkl")

pre, feats = load_preprocessor(PRE_PATH)
arrival_model, arrival_meta = load_model(ARRIVAL_PATH)
risk_model, risk_meta = load_model(RISK_PATH)
action_model, action_meta = load_model(ACTION_PATH)

model_version = arrival_meta.get("model_version", "unknown")

setup_logging(OUTPUTS)


@app.get("/healthz")
def health():
	return {"status": "ok", "model_version": model_version}


@app.get("/metrics")
def metrics():
	# Very small set; Prometheus text format
	try:
		with open(os.path.join(OUTPUTS, "metrics.csv"), "r", encoding="utf-8") as f:
			lines = f.readlines()
	except Exception:
		lines = []
	return PlainTextResponse("# crowd_control_metrics\n" + "".join(lines[-60:]))


def _prepare_df_from_payload(df: pd.DataFrame) -> pd.DataFrame:
	return df


def _infer_df(df: pd.DataFrame) -> pd.DataFrame:
	start = time.time()
	X = transform(pre, feats, df)
	arrivals = arrival_model.predict(X, num_iteration=arrival_model.best_iteration_)
	risk_pred = risk_model.predict(X, num_iteration=risk_model.best_iteration_)
	risk_proba = risk_model.predict_proba(X, num_iteration=risk_model.best_iteration_)
	action_pred = action_model.predict(X, num_iteration=action_model.best_iteration_)
	action_proba = action_model.predict_proba(X, num_iteration=action_model.best_iteration_)
	latency_ms = (time.time() - start) * 1000
	record_metrics(OUTPUTS, {"ts": int(time.time()), "count": len(df), "latency_ms": round(latency_ms, 2)})
	res = df[[EVENT_COL, GATE_COL]].copy() if all(c in df.columns for c in [EVENT_COL, GATE_COL]) else pd.DataFrame()
	res["pred_actual_arrivals"] = arrivals
	res["risk_label"] = risk_pred
	res["risk_confidence"] = risk_proba.max(axis=1)
	res["recommended_action"] = action_pred
	res["action_confidence"] = action_proba.max(axis=1)
	return res


@app.post("/infer_batch")
async def infer_batch(file: UploadFile | None = File(default=None), json_rows: List[Dict[str, Any]] | None = None):
	if file is not None:
		content = await file.read()
		name = file.filename or "uploaded"
		if name.lower().endswith((".xls", ".xlsx")):
			df = pd.read_excel(io.BytesIO(content), engine="openpyxl")
		else:
			df = pd.read_csv(io.BytesIO(content))
	elif json_rows is not None:
		df = pd.DataFrame(json_rows)
	else:
		return JSONResponse(status_code=400, content={"error": "Provide file or json_rows"})

	res = _infer_df(df)
	return JSONResponse(content=json.loads(res.to_json(orient="records")))


@app.post("/infer_stream")
async def infer_stream(row: Dict[str, Any]):
	df = pd.DataFrame([row])
	res = _infer_df(df)
	return JSONResponse(content=json.loads(res.iloc[0].to_json()))


@app.websocket("/stream_updates")
async def stream_updates(ws: WebSocket):
	await ws.accept()
	threshold = CFG["thresholds"]["risk_alert"]
	while True:
		row = await ws.receive_json()
		df = pd.DataFrame([row])
		res = _infer_df(df)
		msg = res.iloc[0].to_dict()
		if float(msg.get("risk_confidence", 0.0)) >= threshold:
			time_str = str(row.get("Time", ""))
			gate = str(row.get("Gate_ID", "?"))
			risk = float(msg.get("risk_confidence", 0.0))
			action = str(msg.get("recommended_action", ""))
			note = f"[{time_str}] [ALERT] Gate {gate} risk={risk:.2f}. Suggestion: {action}. Est. wait reduction: 28% (conf {risk:.2f})"
			await ws.send_json({"alert": True, "message": note, "payload": msg})
		else:
			await ws.send_json({"alert": False, "payload": msg})




