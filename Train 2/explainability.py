from typing import List, Dict, Any
import numpy as np
import shap


def top_shap_features(model, X_row, feature_names: List[str], top_k: int = 3) -> List[Dict[str, Any]]:
	explainer = shap.TreeExplainer(model)
	shap_values = explainer.shap_values(X_row)
	# shap for multiclass returns list; pick max magnitude across classes
	if isinstance(shap_values, list):
		vals = np.vstack([np.abs(v).reshape(-1, v.shape[-1]) for v in shap_values]).max(axis=0)
	else:
		vals = np.abs(shap_values).reshape(-1, shap_values.shape[-1]).mean(axis=0)
	idx = np.argsort(vals)[::-1][:top_k]
	return [{"feature": feature_names[i], "importance": float(vals[i])} for i in idx]



