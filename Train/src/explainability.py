"""SHAP-based explainability for batch requests. Returns top-K features."""
import shap
import numpy as np


def explain(model, X, feature_names, top_k=3):
    # model must be LightGBM Booster or scikit-learn wrapper
    explainer = shap.TreeExplainer(model)
    shap_vals = explainer.shap_values(X)
    # For regression shap_vals is 2D; for multiclass shap_vals is list
    if isinstance(shap_vals, list):
        # sum absolute across classes
        s = np.abs(np.stack(shap_vals)).sum(axis=0).mean(axis=0)
    else:
        s = np.abs(shap_vals).mean(axis=0)
    idx = np.argsort(-s)[:top_k]
    return [(feature_names[i], float(s[i])) for i in idx]
