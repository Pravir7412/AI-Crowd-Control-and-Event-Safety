"""Main training script. Usage examples at bottom and argparse supported."""
import argparse
import pandas as pd
import numpy as np
import os
import time
from sklearn.model_selection import GroupKFold
import lightgbm as lgb
from preprocess import Preprocessor
from models import LGBTrainer, regression_metrics, classification_metrics, save_model
from utils import ensure_dir, now_tag, setup_logging
import joblib
import yaml

logger = setup_logging('outputs/logs/train.log')


def load_data(path):
    if path.endswith('.xlsx') or path.endswith('.xls'):
        return pd.read_excel(path)
    else:
        return pd.read_csv(path)


def split_by_event(df, val_frac=0.1, test_frac=0.1, seed=42):
    events = df['Event_ID'].unique()
    np.random.seed(seed)
    np.random.shuffle(events)
    n = len(events)
    n_test = int(n * test_frac)
    n_val = int(n * val_frac)
    test_e = events[:n_test]
    val_e = events[n_test:n_test + n_val]
    train_e = events[n_test + n_val:]
    train = df[df['Event_ID'].isin(train_e)]
    val = df[df['Event_ID'].isin(val_e)]
    test = df[df['Event_ID'].isin(test_e)]
    return train, val, test


def train_all(args):
    cfg = yaml.safe_load(open(args.config))
    ensure_dir(cfg['project']['output_dir'])
    print('[*] Loading data...')
    df = load_data(args.data)
    print(f'[*] Rows: {len(df)}')
    train_df, val_df, test_df = split_by_event(df)

    pre = Preprocessor(cfg)
    pre.fit(train_df)
    pre_path = pre.save(os.path.join(cfg['project']['output_dir'],'preprocessors'))
    print('[*] Preprocessor saved to', pre_path)

    # Build features
    X_train, feat_names = pre.transform(train_df)
    X_val, _ = pre.transform(val_df)
    X_test, _ = pre.transform(test_df)

    # Targets
    y_arr_train = train_df['Actual_Arrivals'].values
    y_arr_val = val_df['Actual_Arrivals'].values
    y_arr_test = test_df['Actual_Arrivals'].values

    # Arrival model (regression)
    arr_cfg = cfg['training']['arrival']
    dtrain = lgb.Dataset(X_train, label=y_arr_train, feature_name=feat_names)
    dval = lgb.Dataset(X_val, label=y_arr_val, reference=dtrain)
    trainer = LGBTrainer(arr_cfg['params'], arr_cfg['num_boost_round'], arr_cfg['early_stopping_rounds'])
    start = time.time()
    arr_model, arr_eval = trainer.train(dtrain, dval, feat_names)
    elapsed = time.time() - start
    print(f"[Arrival Model] Training time: {elapsed:.1f}s Best iter: {arr_model.best_iteration}")

    # Predict on validation
    y_val_pred = arr_model.predict(X_val, num_iteration=arr_model.best_iteration)
    arr_metrics = regression_metrics(y_arr_val, y_val_pred)
    print(f"[Arrival Model] Validation MAE={arr_metrics['mae']:.3f}, RMSE={arr_metrics['rmse']:.3f}")

    # Save model
    meta = {'trained_on': now_tag(), 'best_iteration': arr_model.best_iteration, 'features': feat_names}
    arr_path = os.path.join(cfg['project']['output_dir'],'models', f"arrival_model_{cfg['project']['model_version_prefix']}.pkl")
    save_model(arr_model, meta, arr_path)
    print('[Arrival Model] Saved to', arr_path)

    # Risk Model (multiclass)
    y_risk_train = train_df['Hotspot_Label'].astype('category').cat.codes.values
    y_risk_val = val_df['Hotspot_Label'].astype('category').cat.codes.values
    # Note: for simplicity we use same mapping (in production store mapping)
    risk_cfg = cfg['training']['risk']
    dtrain_r = lgb.Dataset(X_train, label=y_risk_train)
    dval_r = lgb.Dataset(X_val, label=y_risk_val, reference=dtrain_r)
    trainer_r = LGBTrainer(risk_cfg['params'], risk_cfg['num_boost_round'], risk_cfg['early_stopping_rounds'])
    risk_model, risk_eval = trainer_r.train(dtrain_r, dval_r, feat_names)
    y_val_pred_r = np.argmax(risk_model.predict(X_val, num_iteration=risk_model.best_iteration), axis=1)
    r_metrics = classification_metrics(y_risk_val, y_val_pred_r)
    print(f"[Risk Model] Accuracy={r_metrics['accuracy']:.3f}, F1={r_metrics['f1']:.3f}")
    risk_path = os.path.join(cfg['project']['output_dir'],'models', f"risk_model_{cfg['project']['model_version_prefix']}.pkl")
    save_model(risk_model, {'trained_on': now_tag(), 'best_iteration': risk_model.best_iteration, 'features': feat_names}, risk_path)

    # Action model (multiclass)
    y_act_train = train_df['Recommended_Action'].astype('category').cat.codes.values
    y_act_val = val_df['Recommended_Action'].astype('category').cat.codes.values
    act_cfg = cfg['training']['action']
    dtrain_a = lgb.Dataset(X_train, label=y_act_train)
    dval_a = lgb.Dataset(X_val, label=y_act_val, reference=dtrain_a)
    trainer_a = LGBTrainer(act_cfg['params'], act_cfg['num_boost_round'], act_cfg['early_stopping_rounds'])
    action_model, action_eval = trainer_a.train(dtrain_a, dval_a, feat_names)
    y_val_pred_a = np.argmax(action_model.predict(X_val, num_iteration=action_model.best_iteration), axis=1)
    a_metrics = classification_metrics(y_act_val, y_val_pred_a)
    print(f"[Action Model] Accuracy={a_metrics['accuracy']:.3f}, F1={a_metrics['f1']:.3f}")
    action_path = os.path.join(cfg['project']['output_dir'],'models', f"action_model_{cfg['project']['model_version_prefix']}.pkl")
    save_model(action_model, {'trained_on': now_tag(), 'best_iteration': action_model.best_iteration, 'features': feat_names}, action_path)

    # Save evaluation report
    report = {
        'arrival': arr_metrics,
        'risk': {'accuracy': r_metrics['accuracy'], 'f1': r_metrics['f1']},
        'action': {'accuracy': a_metrics['accuracy'], 'f1': a_metrics['f1']}
    }
    rep_path = os.path.join(cfg['project']['output_dir'],'reports', f'report_{now_tag()}.csv')
    ensure_dir(os.path.dirname(rep_path))
    pd.DataFrame({k:[v] for k,v in report.items()}).to_csv(rep_path, index=False)
    print('[*] Training complete. Report saved to', rep_path)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--data', required=True, help='Path to input Excel/CSV')
    parser.add_argument('--config', default='configs/config.yaml')
    args = parser.parse_args()
    train_all(args)
