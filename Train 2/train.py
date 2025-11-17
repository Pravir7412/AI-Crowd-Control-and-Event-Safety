import argparse
import os
import json
import time
from datetime import datetime
import numpy as np
import pandas as pd
import joblib
import yaml
from sklearn.model_selection import GroupKFold, train_test_split
from sklearn.preprocessing import LabelEncoder
from preprocess import engineer_features, fit_transform_save, load_preprocessor, transform, TARGETS, EVENT_COL
from models import train_lgbm_regression, train_lgbm_classifier, save_model
from utils import setup_logging, save_json


def load_data(path: str) -> pd.DataFrame:
	if path.lower().endswith((".xls", ".xlsx")):
		df = pd.read_excel(path, engine="openpyxl")
	else:
		df = pd.read_csv(path)
	return df


def split_by_event(df: pd.DataFrame, test_size: float = 0.2, val_size: float = 0.1, seed: int = 42):
	events = df[EVENT_COL].astype(str).unique()
	train_events, test_events = train_test_split(events, test_size=test_size, random_state=seed)
	train_events, val_events = train_test_split(train_events, test_size=val_size, random_state=seed)
	tr = df[df[EVENT_COL].astype(str).isin(train_events)].copy()
	va = df[df[EVENT_COL].astype(str).isin(val_events)].copy()
	te = df[df[EVENT_COL].astype(str).isin(test_events)].copy()
	return tr, va, te


def main():
	parser = argparse.ArgumentParser()
	parser.add_argument("--data", required=True)
	parser.add_argument("--outputs", default="outputs")
	parser.add_argument("--config", default="config.yaml")
	parser.add_argument("--num_boost_round", type=int, default=None)
	parser.add_argument("--early_stopping_rounds", type=int, default=None)
	parser.add_argument("--cv", type=int, default=0, help="k-fold CV by Event_ID, 0 to skip")
	args = parser.parse_args()

	os.makedirs(args.outputs, exist_ok=True)
	setup_logging(args.outputs)
	with open(args.config, "r", encoding="utf-8") as f:
		cfg = yaml.safe_load(f)

	lgb_params_reg = {
		"learning_rate": cfg["lightgbm"]["learning_rate"],
		"num_leaves": cfg["lightgbm"]["num_leaves"],
		"feature_fraction": cfg["lightgbm"]["feature_fraction"],
		"bagging_fraction": cfg["lightgbm"]["bagging_fraction"],
		"bagging_freq": cfg["lightgbm"]["bagging_freq"],
		"max_depth": cfg["lightgbm"]["max_depth"],
		"reg_alpha": cfg["lightgbm"]["lambda_l1"],
		"reg_lambda": cfg["lightgbm"]["lambda_l2"],
		"min_child_samples": cfg["lightgbm"]["min_data_in_leaf"],
		"n_estimators": args.num_boost_round or cfg["training"]["num_boost_round"],
		"random_state": cfg["training"]["seed"],
	}
	lgb_params_clf = dict(lgb_params_reg)
	lgb_params_clf.update({"objective": "multiclass", "verbose": -1})
	lgb_params_reg.update({"objective": "regression", "verbose": -1})

	early_rounds = args.early_stopping_rounds or cfg["training"]["early_stopping_rounds"]

	print("[Data] Loading...", args.data)
	df = load_data(args.data)
	print(f"[Data] Loaded rows={len(df):,}")

	# Label encoders for classifiers
	enc_risk = LabelEncoder()
	enc_action = LabelEncoder()

	# Train/val/test split by Event_ID
	tr_df, va_df, te_df = split_by_event(df)
	print(f"[Split] Train={len(tr_df):,} Val={len(va_df):,} Test={len(te_df):,}")

	# Fit preprocessor on train only
	X_tr, pre, feats = fit_transform_save(tr_df, args.outputs)
	X_va = transform(pre, feats, va_df)
	X_te = transform(pre, feats, te_df)

	# Targets
	y_arr_tr = tr_df[TARGETS["arrival"]].values
	y_arr_va = va_df[TARGETS["arrival"]].values
	y_arr_te = te_df[TARGETS["arrival"]].values

	y_risk_tr = enc_risk.fit_transform(tr_df[TARGETS["risk"]].astype(str).values)
	y_risk_va = enc_risk.transform(va_df[TARGETS["risk"]].astype(str).values)
	y_risk_te = enc_risk.transform(te_df[TARGETS["risk"]].astype(str).values)

	y_act_tr = enc_action.fit_transform(tr_df[TARGETS["action"]].astype(str).values)
	y_act_va = enc_action.transform(va_df[TARGETS["action"]].astype(str).values)
	y_act_te = enc_action.transform(te_df[TARGETS["action"]].astype(str).values)

	# Update classifier params with class counts
	lgb_params_clf["num_class"] = int(len(np.unique(y_risk_tr)))

	# Train models
	arrival_model, arrival_meta = train_lgbm_regression(X_tr, y_arr_tr, X_va, y_arr_va, lgb_params_reg, lgb_params_reg["n_estimators"], early_rounds, "Arrival Model")
	risk_model, risk_meta = train_lgbm_classifier(X_tr, y_risk_tr, X_va, y_risk_va, lgb_params_clf, lgb_params_clf["n_estimators"], early_rounds, "Risk Model")
	action_model, action_meta = train_lgbm_classifier(X_tr, y_act_tr, X_va, y_act_va, lgb_params_clf, lgb_params_clf["n_estimators"], early_rounds, "Action Model")

	# Save artifacts
	model_version = datetime.utcnow().strftime("%Y-%m-%d_v1")
	save_model(os.path.join(args.outputs, "arrival_model.pkl"), arrival_model, {**arrival_meta, "trained_on_date": datetime.utcnow().isoformat(), "features": feats, "model_version": model_version})
	save_model(os.path.join(args.outputs, "risk_model.pkl"), risk_model, {**risk_meta, "trained_on_date": datetime.utcnow().isoformat(), "features": feats, "classes": enc_risk.classes_.tolist(), "model_version": model_version})
	save_model(os.path.join(args.outputs, "action_model.pkl"), action_model, {**action_meta, "trained_on_date": datetime.utcnow().isoformat(), "features": feats, "classes": enc_action.classes_.tolist(), "model_version": model_version})
	joblib.dump(enc_risk, os.path.join(args.outputs, "risk_encoder.pkl"))
	joblib.dump(enc_action, os.path.join(args.outputs, "action_encoder.pkl"))

	# Test evaluations and save CSV
	import csv
	pred_arr = arrival_model.predict(X_te, num_iteration=arrival_model.best_iteration_)
	pred_risk = risk_model.predict(X_te, num_iteration=risk_model.best_iteration_)
	pred_action = action_model.predict(X_te, num_iteration=action_model.best_iteration_)
	from models import evaluate_regression, evaluate_classifier
	reg_metrics = evaluate_regression(y_arr_te, pred_arr)
	clf_risk = evaluate_classifier(y_risk_te, pred_risk)
	clf_action = evaluate_classifier(y_act_te, pred_action)
	with open(os.path.join(args.outputs, "evaluation_summary.json"), "w", encoding="utf-8") as f:
		json.dump({"arrival": reg_metrics, "risk": {"accuracy": clf_risk["accuracy"], "f1": clf_risk["f1"]}, "action": {"accuracy": clf_action["accuracy"], "f1": clf_action["f1"]}}, f, indent=2)
	# detailed CSVs
	pd.DataFrame({"y_true": y_arr_te, "y_pred": pred_arr}).to_csv(os.path.join(args.outputs, "arrival_test_preds.csv"), index=False)
	pd.DataFrame({"y_true": y_risk_te, "y_pred": pred_risk}).to_csv(os.path.join(args.outputs, "risk_test_preds.csv"), index=False)
	pd.DataFrame({"y_true": y_act_te, "y_pred": pred_action}).to_csv(os.path.join(args.outputs, "action_test_preds.csv"), index=False)

	print(f"[Arrival Model] Validation MAE={arrival_meta['val_mae']:.3f}, RMSE={arrival_meta['val_rmse']:.3f}")
	print(f"[Risk Model] Accuracy={risk_meta['val_accuracy']:.3f}, F1={risk_meta['val_f1']:.3f}")
	print(f"[Action Model] Accuracy={action_meta['val_accuracy']:.3f}, F1={action_meta['val_f1']:.3f}")

	# Optional CV
	if args.cv and args.cv > 1:
		print(f"[CV] Running {args.cv}-fold GroupKFold by Event_ID ...")
		gkf = GroupKFold(n_splits=args.cv)
		rows = []
		fe_df = engineer_features(df)
		from preprocess import build_preprocessor
		pre_cv, feats_cv = build_preprocessor(fe_df)
		X_all = pre_cv.fit_transform(fe_df[feats_cv])
		enc_risk_cv = LabelEncoder().fit(df[TARGETS["risk"]].astype(str).values)
		enc_action_cv = LabelEncoder().fit(df[TARGETS["action"]].astype(str).values)
		y_arr = df[TARGETS["arrival"]].values
		y_risk = enc_risk_cv.transform(df[TARGETS["risk"]].astype(str).values)
		y_action = enc_action_cv.transform(df[TARGETS["action"]].astype(str).values)
		groups = df[EVENT_COL].astype(str).values
		for i, (tr, va) in enumerate(gkf.split(X_all, y_arr, groups=groups), 1):
			am, ameta = train_lgbm_regression(X_all[tr], y_arr[tr], X_all[va], y_arr[va], lgb_params_reg, lgb_params_reg["n_estimators"], early_rounds, f"Arrival Model CV{i}")
			rm, rmeta = train_lgbm_classifier(X_all[tr], y_risk[tr], X_all[va], y_risk[va], lgb_params_clf, lgb_params_clf["n_estimators"], early_rounds, f"Risk Model CV{i}")
			aim, aimeta = train_lgbm_classifier(X_all[tr], y_action[tr], X_all[va], y_action[va], lgb_params_clf, lgb_params_clf["n_estimators"], early_rounds, f"Action Model CV{i}")
			rows.append({"fold": i, "arrival_mae": ameta["val_mae"], "arrival_rmse": ameta["val_rmse"], "risk_acc": rmeta["val_accuracy"], "risk_f1": rmeta["val_f1"], "action_acc": aimeta["val_accuracy"], "action_f1": aimeta["val_f1"]})
		pd.DataFrame(rows).to_csv(os.path.join(args.outputs, "cv_metrics.csv"), index=False)

	print("Training complete. Artifacts saved to:", args.outputs)


if __name__ == "__main__":
	main()




