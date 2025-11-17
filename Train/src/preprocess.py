"""Preprocessing: load excel/csv, feature engineering, encoders, and saving preprocessor.pkl

Key points:
- Time features
- Rolling aggregations per gate for buckets (1/5/15 min)
- Categorical encoding: target / frequency fallback
- Imputation and scaling (StandardScaler for numerics)
"""
import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler, OrdinalEncoder
from sklearn.impute import SimpleImputer
import joblib
from collections import defaultdict
from datetime import timedelta
import os
from .utils import ensure_dir, now_tag


class Preprocessor:
    def __init__(self, config):
        self.config = config
        self.time_buckets = config['preprocessing']['time_buckets']
        self.num_imputer = SimpleImputer(strategy=config['preprocessing'].get('impute_strategy','median'))
        self.scaler = StandardScaler()
        self.cat_encoder = OrdinalEncoder(handle_unknown='use_encoded_value', unknown_value=-1)
        self.cat_cols = None
        self.num_cols = None
        self.fitted = False

    def _time_features(self, df):
        # assume Time column parseable
        df = df.copy()
        df['Time'] = pd.to_datetime(df['Time'])
        df['hour'] = df['Time'].dt.hour
        df['minute'] = df['Time'].dt.minute
        df['dayofweek'] = df['Time'].dt.dayofweek
        df['is_weekend'] = df['dayofweek'] >= 5
        return df

    def _aggregations(self, df):
        # compute per-gate rolling aggregations for each bucket (1/5/15 minutes) using groupby + rolling via resample
        df = df.copy()
        df.set_index('Time', inplace=True)
        agg_frames = []
        for bucket in self.time_buckets:
            rule = f"{bucket}T"
            g = df.groupby(['Gate_ID']).resample(rule)['Actual_Arrivals'].agg(['sum','mean','std']).reset_index()
            g.columns = ['Gate_ID','Time'] + [f'ActualArrivals_{bucket}min_sum', f'ActualArrivals_{bucket}min_mean', f'ActualArrivals_{bucket}min_std']
            agg_frames.append(g.set_index(['Gate_ID','Time']))
        # merge aggregates into main df
        multi = pd.concat(agg_frames, axis=1)
        multi = multi.reset_index()
        df = df.reset_index()
        merged = pd.merge(df, multi, on=['Gate_ID','Time'], how='left')
        return merged

    def fit(self, df: pd.DataFrame):
        df = df.copy()
        df = self._time_features(df)
        df = self._aggregations(df)
        # determine columns
        exclude = ['Person_ID','Time','Event_ID','Actual_Arrivals','Hotspot_Label','Recommended_Action']
        self.cat_cols = [c for c in df.columns if df[c].dtype == 'object' and c not in exclude]
        self.num_cols = [c for c in df.columns if c not in self.cat_cols and c not in exclude]
        # fit imputers/encoders/scaler
        self.cat_encoder.fit(df[self.cat_cols].fillna('missing'))
        self.num_imputer.fit(df[self.num_cols])
        self.scaler.fit(self.num_imputer.transform(df[self.num_cols]))
        self.fitted = True
        return self

    def transform(self, df: pd.DataFrame):
        df = df.copy()
        df = self._time_features(df)
        df = self._aggregations(df)
        # fill
        if self.cat_cols is None or self.num_cols is None:
            raise RuntimeError('Preprocessor not fitted or columns unknown')
        cat = df[self.cat_cols].fillna('missing')
        num = self.num_imputer.transform(df[self.num_cols])
        num = self.scaler.transform(num)
        cat_enc = self.cat_encoder.transform(cat)
        X = np.hstack([num, cat_enc])
        feature_names = list(self.num_cols) + [f'cat_{c}' for c in self.cat_cols]
        return X, feature_names

    def save(self, output_dir):
        ensure_dir(output_dir)
        path = os.path.join(output_dir, f'preprocessor_{now_tag()}.pkl')
        joblib.dump(self, path)
        return path

    @staticmethod
    def load(path):
        return joblib.load(path)
