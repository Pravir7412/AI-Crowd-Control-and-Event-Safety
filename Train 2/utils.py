import hashlib
import json
import logging
import os
from datetime import datetime
from logging.handlers import RotatingFileHandler
from typing import Any, Dict

import orjson


def setup_logging(outputs_dir: str) -> None:
	os.makedirs(outputs_dir, exist_ok=True)
	logger = logging.getLogger()
	logger.setLevel(logging.INFO)
	# Avoid duplicate handlers if reloaded
	if logger.handlers:
		return
	log_path = os.path.join(outputs_dir, "app.log")
	handler = RotatingFileHandler(log_path, maxBytes=5_000_000, backupCount=3)
	formatter = logging.Formatter(
		"%(asctime)s | %(levelname)s | %(name)s | %(message)s", "%Y-%m-%d %H:%M:%S"
	)
	handler.setFormatter(formatter)
	logger.addHandler(handler)
	console = logging.StreamHandler()
	console.setFormatter(formatter)
	logger.addHandler(console)


def now_ts() -> str:
	return datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")


def checksum_dict(d: Dict[str, Any]) -> str:
	payload = orjson.dumps(d, option=orjson.OPT_SORT_KEYS)
	return hashlib.md5(payload).hexdigest()


def record_metrics(outputs_dir: str, metrics: Dict[str, Any]) -> None:
	os.makedirs(outputs_dir, exist_ok=True)
	path = os.path.join(outputs_dir, "metrics.csv")
	line: str
	if not os.path.exists(path):
		line = ",".join(metrics.keys()) + "\n"
		with open(path, "w", encoding="utf-8") as f:
			f.write(line)
	line = ",".join(str(metrics[k]) for k in metrics.keys()) + "\n"
	with open(path, "a", encoding="utf-8") as f:
		f.write(line)


def human_time(ms: float) -> str:
	return f"{ms:.1f}ms"


def save_json(path: str, data: Dict[str, Any]) -> None:
	with open(path, "w", encoding="utf-8") as f:
		json.dump(data, f, indent=2, default=str)
