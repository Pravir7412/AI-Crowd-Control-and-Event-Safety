"""Model training and helpers for LightGBM and River fallback."""
import lightgbm as lgb
import numpy as np
import pandas as pd
import joblib
from sklearn.metrics import mean_absolute_error, mean_squared_error, accuracy_score, f1_score, confusion_matrix
from datetime import datetime
from .utils import ensure_dir, now_tag
import os


def save_model(model, metadata, path):
    ensure_dir(os.path.dirname(path))
    joblib.dump({'model': model, 'metadata': metadata}, path)


class LGBTrainer:
    def __init__(self, params, num_boost_round=1000, early_stopping_rounds=100):
        self.params = params
        self.num_boost_round = num_boost_round
        self.early_stopping_rounds = early_stopping_rounds

    def train(self, dtrain, dval, feature_names, objective='regression'):
        evals_result = {}
        print(f"Training: up to {self.num_boost_round} rounds with early stopping({self.early_stopping_rounds})...")
        booster = lgb.train(self.params, dtrain, num_boost_round=self.num_boost_round,
                            valid_sets=[dtrain, dval], valid_names=['train','valid'],
                            early_stopping_rounds=self.early_stopping_rounds,
                            evals_result=evals_result, verbose_eval=10)
        best_iter = booster.best_iteration
        print(f"Best iteration: {best_iter}")
        return booster, evals_result


def regression_metrics(y_true, y_pred):
    mae = mean_absolute_error(y_true, y_pred)
    rmse = mean_squared_error(y_true, y_pred, squared=False)
    return {'mae': mae, 'rmse': rmse}


def classification_metrics(y_true, y_pred, labels=None):
    acc = accuracy_score(y_true, y_pred)
    f1 = f1_score(y_true, y_pred, average='weighted')
    cm = confusion_matrix(y_true, y_pred, labels=labels)
    return {'accuracy': acc, 'f1': f1, 'confusion_matrix': cm}
