import argparse
import os
import pandas as pd
import joblib
from datetime import datetime
from preprocess import load_preprocessor, transform, engineer_features, TARGETS
from models import load_model, save_model

# River fallback models
from river import linear_model, optim, preprocessing


def validate_new_data(df: pd.DataFrame) -> bool:
	must_cols = ["Event_ID", "Gate_ID", "Time", TARGETS["arrival"], TARGETS["risk"], TARGETS["action"]]
	missing = [c for c in must_cols if c not in df.columns]
	return len(missing) == 0


def mini_batch_retrain(new_df: pd.DataFrame, outputs: str):
	pre, feats = load_preprocessor(os.path.join(outputs, "preprocessor.pkl"))
	arr_m, arr_meta = load_model(os.path.join(outputs, "arrival_model.pkl"))
	risk_m, risk_meta = load_model(os.path.join(outputs, "risk_model.pkl"))
	action_m, action_meta = load_model(os.path.join(outputs, "action_model.pkl"))

	df_feat = engineer_features(new_df)
	X = pre.transform(df_feat[feats])
	y_arr = new_df[TARGETS["arrival"]].values
	y_risk = new_df[TARGETS["risk"]].astype(str).values
	y_action = new_df[TARGETS["action"]].astype(str).values
	print(f"[Incremental] Using {len(new_df):,} new rows for update")
	# LightGBM sklearn API doesn't support partial_fit; show re-fit suggestion
	arr_m.fit(X, y_arr, init_model=None)
	risk_m.fit(X, y_risk)
	action_m.fit(X, y_action)
	version = datetime.utcnow().strftime("%Y-%m-%d_v2")
	save_model(os.path.join(outputs, "arrival_model.pkl"), arr_m, {**arr_meta, "updated_on": datetime.utcnow().isoformat(), "model_version": version})
	save_model(os.path.join(outputs, "risk_model.pkl"), risk_m, {**risk_meta, "updated_on": datetime.utcnow().isoformat(), "model_version": version})
	save_model(os.path.join(outputs, "action_model.pkl"), action_m, {**action_meta, "updated_on": datetime.utcnow().isoformat(), "model_version": version})
	print("[Incremental] Models updated and versioned.")


def river_online_learn(new_df: pd.DataFrame):
	# Simple online learners per target (illustrative)
	reg = preprocessing.StandardScaler() | linear_model.LinearRegression(optimizer=optim.SGD(0.01))
	clf_risk = preprocessing.StandardScaler() | linear_model.LogisticRegression()
	clf_action = preprocessing.StandardScaler() | linear_model.LogisticRegression()
	for _, row in new_df.iterrows():
		x = row.to_dict()
		reg.learn_one(x, float(row[TARGETS["arrival"]]))
		clf_risk.learn_one(x, str(row[TARGETS["risk"]]))
		clf_action.learn_one(x, str(row[TARGETS["action"]]))
	return reg, clf_risk, clf_action


def main():
	p = argparse.ArgumentParser()
	p.add_argument("--new_data", required=True)
	p.add_argument("--outputs", default="outputs")
	args = p.parse_args()

	df = pd.read_excel(args.new_data, engine="openpyxl") if args.new_data.lower().endswith(".xlsx") else pd.read_csv(args.new_data)
	if not validate_new_data(df):
		raise ValueError("New data missing required columns for safe update")
	mini_batch_retrain(df, args.outputs)
	# For river example, we just run and print completion
	_ = river_online_learn(df)
	print("[River] Online learners updated for session; consider nightly merge by retraining.")


if __name__ == "__main__":
	main()


