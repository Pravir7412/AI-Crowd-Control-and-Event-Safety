import os
import pandas as pd
import numpy as np
from typing import List, Tuple, Dict, Any
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.impute import SimpleImputer
import joblib

TIME_COL = "Time"
EVENT_COL = "Event_ID"
GATE_COL = "Gate_ID"
TARGETS = {
	"arrival": "Actual_Arrivals",
	"risk": "Hotspot_Label",
	"action": "Recommended_Action",
}

CATEGORICAL_COLS = [
	"Scenario_Type",
	"Gate_ID",
	"Seat_Zone",
	"Transport_Mode",
	"Transport_Arrival",
	"Weather",
	"Archetype",
]

NUMERIC_COLS = [
	"Gate_Capacity",
	"Expected_Arrivals",
	"Queue_Length",
	"Density",
	"Evacuation_Time",
]

TIME_BUCKETS_MIN = [1, 5, 15]


def _parse_time(df: pd.DataFrame) -> pd.DataFrame:
	if pd.api.types.is_datetime64_any_dtype(df[TIME_COL]):
		return df
	# Try to parse common formats
	df[TIME_COL] = pd.to_datetime(df[TIME_COL], errors="coerce")
	return df


def _time_features(df: pd.DataFrame) -> pd.DataFrame:
	df = df.copy()
	df = _parse_time(df)
	df["hour"] = df[TIME_COL].dt.hour
	df["minute"] = df[TIME_COL].dt.minute
	df["weekday"] = df[TIME_COL].dt.weekday
	# round down to minute buckets
	for m in TIME_BUCKETS_MIN:
		col = f"time_bucket_{m}m"
		df[col] = df[TIME_COL].dt.floor(f"{m}min")
	return df


def _per_gate_aggregations(df: pd.DataFrame) -> pd.DataFrame:
	df = df.copy()
	df = _time_features(df)
	for m in TIME_BUCKETS_MIN:
		bucket_col = f"time_bucket_{m}m"
		group_cols = [EVENT_COL, GATE_COL, bucket_col]
		agg = (
			df.groupby(group_cols)[["Actual_Arrivals", "Expected_Arrivals", "Queue_Length", "Density"]]
			.agg(["sum", "mean"])
		)
		agg.columns = [f"{c[0]}_{c[1]}_{m}m" for c in agg.columns]
		df = df.merge(agg.reset_index(), on=group_cols, how="left")
	return df


def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
	df = _per_gate_aggregations(df)
	return df


def build_preprocessor(df: pd.DataFrame) -> Tuple[Pipeline, List[str]]:
	feature_cols: List[str] = (
		CATEGORICAL_COLS
		+ NUMERIC_COLS
		+ ["hour", "minute", "weekday"]
	)
	# add engineered aggregate columns
	engineered = [c for c in df.columns if any(c.endswith(suf) for suf in ["_1m", "_5m", "_15m"]) and c not in feature_cols]
	feature_cols += engineered
	categoricals = [c for c in feature_cols if c in CATEGORICAL_COLS]
	numerics = [c for c in feature_cols if c not in CATEGORICAL_COLS]
	ct = ColumnTransformer(
		transformers=[
			("cat", Pipeline([
				("imputer", SimpleImputer(strategy="most_frequent")),
				("ohe", OneHotEncoder(handle_unknown="ignore", sparse_output=True)),
			]), categoricals),
			("num", Pipeline([
				("imputer", SimpleImputer(strategy="median")),
				("scaler", StandardScaler(with_mean=False)),
			]), numerics),
		],
		sparse_threshold=0.3,
	)
	pipe = Pipeline(steps=[("pre", ct)])
	return pipe, feature_cols


def fit_transform_save(df: pd.DataFrame, outputs_dir: str) -> Tuple[np.ndarray, Pipeline, List[str]]:
	os.makedirs(outputs_dir, exist_ok=True)
	df_feat = engineer_features(df)
	pre, feats = build_preprocessor(df_feat)
	X = pre.fit_transform(df_feat[feats])
	joblib.dump({"pipeline": pre, "features": feats}, os.path.join(outputs_dir, "preprocessor.pkl"))
	return X, pre, feats


def load_preprocessor(path: str) -> Tuple[Pipeline, List[str]]:
	bundle = joblib.load(path)
	return bundle["pipeline"], bundle["features"]


def transform(pre: Pipeline, feats: List[str], df: pd.DataFrame) -> Any:
	df_feat = engineer_features(df)
	missing = [c for c in feats if c not in df_feat.columns]
	for c in missing:
		# add missing engineered columns as NaN
		df_feat[c] = np.nan
	return pre.transform(df_feat[feats])


