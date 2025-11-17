"""FastAPI serving app with batch and stream endpoints plus websocket alerts."""
from fastapi import FastAPI, UploadFile, File, WebSocket, BackgroundTasks
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import uvicorn
import joblib
import pandas as pd
import numpy as np
import time
from .feature_store import RedisFeatureStore
from .utils import setup_logging
from .explainability import explain
import yaml
import os

logger = setup_logging('outputs/logs/serve.log')
app = FastAPI()

cfg = yaml.safe_load(open('configs/config.yaml'))
FEATURE_STORE = RedisFeatureStore(cfg['serve']['redis_url'], enabled=cfg['serve']['redis_enabled'])

# Load latest models and preprocessor
MODEL_DIR = os.path.join(cfg['project']['output_dir'],'models')
PRE_DIR = os.path.join(cfg['project']['output_dir'],'preprocessors')

# simple loader helper
def load_latest(path, startswith=None):
    files = [os.path.join(path,f) for f in os.listdir(path) if f.endswith('.pkl')]
    files.sort(key=lambda x: os.path.getmtime(x), reverse=True)
    return files[0]

PREPROCESSOR = joblib.load(load_latest(PRE_DIR))
ARR = joblib.load(load_latest(MODEL_DIR))['model']
RISK = joblib.load(load_latest(MODEL_DIR))['model']
ACTION = joblib.load(load_latest(MODEL_DIR))['model']
MODEL_VERSION = joblib.load(load_latest(MODEL_DIR))['metadata'].get('trained_on','unknown')

# warm-up
_warm_X = np.zeros((1, len(PREPROCESSOR.num_cols) + len(PREPROCESSOR.cat_cols)))
ARR.predict(_warm_X)
RISK.predict(_warm_X)
ACTION.predict(_warm_X)

class StreamInput(BaseModel):
    Person_ID: int
    Time: str
    Scenario_Type: str
    Gate_ID: str
    Seat_Zone: str | None = None
    Transport_Mode: str | None = None
    Transport_Arrival: str | None = None
    Weather: str | None = None
    Gate_Capacity: float | None = None
    Expected_Arrivals: float | None = None
    Queue_Length: float | None = None
    Density: float | None = None
    Archetype: str | None = None
    Event_ID: str

@app.post('/infer_stream')
async def infer_stream(payload: StreamInput):
    t0 = time.time()
    row = pd.DataFrame([payload.dict()])
    X, feat_names = PREPROCESSOR.transform(row)
    # update feature store
    ts = pd.to_datetime(payload.Time).timestamp()
    FEATURE_STORE.update(payload.Gate_ID, ts, payload.Expected_Arrivals or 0, bucket_minutes=5)
    # predict
    arr_pred = float(ARR.predict(X, num_iteration=ARR.best_iteration)[0])
    risk_proba = RISK.predict(X, num_iteration=RISK.best_iteration)[0]
    risk_cls = int(np.argmax(risk_proba))
    action_proba = ACTION.predict(X, num_iteration=ACTION.best_iteration)[0]
    action_cls = int(np.argmax(action_proba))
    latency_ms = (time.time() - t0) * 1000
    resp = {
        'arrival': arr_pred,
        'risk_class': risk_cls,
        'risk_prob': float(np.max(risk_proba)),
        'action': action_cls,
        'action_conf': float(np.max(action_proba)),
        'features': feat_names,
        'model_version': MODEL_VERSION,
        'latency_ms': latency_ms
    }
    # alerting
    if resp['risk_prob'] > cfg['serve']['risk_alert_threshold']:
        # in prod push to webhook / twilio
        msg = f"[{payload.Time}] [ALERT] Gate {payload.Gate_ID} risk={resp['risk_prob']:.2f}. Suggestion: OPEN_EXTRA_GATE."
        logger.warning(msg)
    return JSONResponse(resp)

@app.post('/infer_batch')
async def infer_batch(file: UploadFile = File(...)):
    t0 = time.time()
    # accept csv, xlsx or json
    content = await file.read()
    ext = file.filename.split('.')[-1]
    if ext in ('csv','txt'):
        df = pd.read_csv(pd.io.common.BytesIO(content))
    elif ext in ('xls','xlsx'):
        df = pd.read_excel(pd.io.common.BytesIO(content))
    else:
        # try json
        import json
        df = pd.DataFrame(json.loads(content))
    X, feat_names = PREPROCESSOR.transform(df)
    arr = ARR.predict(X, num_iteration=ARR.best_iteration)
    risk = RISK.predict(X, num_iteration=RISK.best_iteration)
    action = ACTION.predict(X, num_iteration=ACTION.best_iteration)
    out = df.copy()
    out['pred_arrival'] = arr
    out['pred_risk_class'] = np.argmax(risk, axis=1)
    out['pred_risk_prob'] = np.max(risk, axis=1)
    out['pred_action'] = np.argmax(action, axis=1)
    out['pred_action_conf'] = np.max(action, axis=1)
    latency_ms = (time.time() - t0) * 1000
    return JSONResponse({'rows': len(out), 'latency_ms': latency_ms, 'predictions': out.to_dict(orient='records')})

@app.websocket('/stream_updates')
async def stream_updates(ws: WebSocket):
    await ws.accept()
    try:
        while True:
            msg = await ws.receive_text()
            await ws.send_text('heartbeat')
    except Exception:
        await ws.close()

@app.get('/health')
async def health():
    return {'status':'ok','model_version': MODEL_VERSION}

@app.get('/metrics')
async def metrics():
    # simple prometheus-friendly output
    return """
# HELP crowd_inference_latency_ms Latency ms
# TYPE crowd_inference_latency_ms gauge
crowd_inference_latency_ms 0
"""

if __name__ == '__main__':
    uvicorn.run('src.serve:app', host='0.0.0.0', port=8000, reload=False)
