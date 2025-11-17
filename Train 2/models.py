from typing import Dict, Any, Tuple, List
import time
import json
import numpy as np
import pandas as pd
import lightgbm as lgb
from sklearn.metrics import mean_absolute_error, mean_squared_error, accuracy_score, f1_score, confusion_matrix
import joblib


def train_lgbm_regression(X_tr, y_tr, X_val, y_val, params: Dict[str, Any], num_boost_round: int, early_stopping_rounds: int, label: str) -> Tuple[lgb.LGBMRegressor, Dict[str, Any]]:
	model = lgb.LGBMRegressor(**params)
	start = time.time()
	print(f"[{label}] Training for up to {num_boost_round} rounds with early stopping({early_stopping_rounds})...")
	model.fit(
		X_tr, y_tr,
		eval_set=[(X_val, y_val)],
		eval_metric=["l1", "l2"],
		callbacks=[
			lgb.early_stopping(early_stopping_rounds, verbose=True),
			lgb.log_evaluation(period=1),
		],
		verbose=False,
	)
	dur = time.time() - start
	best_it = model.best_iteration_
	pred_val = model.predict(X_val, num_iteration=best_it)
	mae = mean_absolute_error(y_val, pred_val)
	rmse = mean_squared_error(y_val, pred_val, squared=False)
	print(f"[{label}] Best iteration: {best_it}")
	print(f"[{label}] Validation MAE={mae:.3f}, RMSE={rmse:.3f}")
	summary = {"best_iteration": int(best_it), "val_mae": float(mae), "val_rmse": float(rmse), "train_seconds": dur}
	return model, summary


def train_lgbm_classifier(X_tr, y_tr, X_val, y_val, params: Dict[str, Any], num_boost_round: int, early_stopping_rounds: int, label: str) -> Tuple[lgb.LGBMClassifier, Dict[str, Any]]:
	model = lgb.LGBMClassifier(**params)
	start = time.time()
	print(f"[{label}] Training for up to {num_boost_round} rounds with early stopping({early_stopping_rounds})...")
	model.fit(
		X_tr, y_tr,
		eval_set=[(X_val, y_val)],
		eval_metric=["logloss", "multi_logloss"],
		callbacks=[
			lgb.early_stopping(early_stopping_rounds, verbose=True),
			lgb.log_evaluation(period=1),
		],
		verbose=False,
	)
	dur = time.time() - start
	best_it = model.best_iteration_
	pred = model.predict(X_val, num_iteration=best_it)
	proba = None
	try:
		proba = model.predict_proba(X_val, num_iteration=best_it)
	except Exception:
		pass
	acc = accuracy_score(y_val, pred)
	f1 = f1_score(y_val, pred, average="weighted")
	cm = confusion_matrix(y_val, pred)
	print(f"[{label}] Best iteration: {best_it}")
	print(f"[{label}] Accuracy={acc:.3f}, F1={f1:.3f}")
	summary = {"best_iteration": int(best_it), "val_accuracy": float(acc), "val_f1": float(f1), "confusion_matrix": cm.tolist(), "train_seconds": dur}
	return model, summary


def save_model(path: str, model, metadata: Dict[str, Any]) -> None:
	joblib.dump({"model": model, "metadata": metadata}, path)


def load_model(path: str):
	bundle = joblib.load(path)
	return bundle["model"], bundle.get("metadata", {})


def evaluate_classifier(y_true, y_pred) -> Dict[str, Any]:
	acc = accuracy_score(y_true, y_pred)
	f1 = f1_score(y_true, y_pred, average="weighted")
	cm = confusion_matrix(y_true, y_pred)
	return {"accuracy": acc, "f1": f1, "confusion_matrix": cm}


def evaluate_regression(y_true, y_pred) -> Dict[str, Any]:
	mae = mean_absolute_error(y_true, y_pred)
	rmse = mean_squared_error(y_true, y_pred, squared=False)
	return {"mae": mae, "rmse": rmse}



