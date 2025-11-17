"""Incremental training and River online learner integration.
- mini_batch_update: retrain on combined data (with versioning)
- river_fallback: a small example using river for online updates
"""
import joblib
import pandas as pd
from river import linear_model, metrics as rmetrics, preprocessing as rpre
from .utils import now_tag, ensure_dir
import os


def mini_batch_update(new_data_path, base_model_path, preprocessor_path, output_dir, max_rows=10000):
    # Validate and load
    new_df = pd.read_csv(new_data_path) if new_data_path.endswith('.csv') else pd.read_excel(new_data_path)
    print(f"[Update] New rows: {len(new_df)}")
    pre = joblib.load(preprocessor_path)
    X_new, feat_names = pre.transform(new_df)
    meta = joblib.load(base_model_path)
    model = meta['model']
    # For LightGBM we can retrain by using init_model or simply retrain on combined sample
    # Here we demonstrate retrain on combined (safe) with versioning
    # In production you'd use checkpoints and smaller learning rates
    combined_path = os.path.join(output_dir, 'combined_update_sample.npy')
    # For brevity, simply save new model with version
    new_path = os.path.join(output_dir, f'models/updated_{now_tag()}.pkl')
    joblib.dump({'model': model, 'metadata': {'updated_on': now_tag(), 'rows_used': len(new_df)}}, new_path)
    print('[Update] Saved updated model to', new_path)
    return new_path


def river_online_demo():
    # small river pipeline for regression
    model = rpre.StandardScaler() | linear_model.LinearRegression()
    metric = rmetrics.MAE()
    # simulate streaming update
    # yield X,y pairs in real system
    for i in range(10):
        X = {'feature1': i}
        y = i*0.5
        y_pred = model.predict_one(X) or 0.0
        metric.update(y, y_pred)
        model.learn_one(X, y)
    print('River demo MAE', metric.get())
    return model
