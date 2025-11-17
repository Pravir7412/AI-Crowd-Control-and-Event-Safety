"""Utility helpers: logging, filesystem, timing, small data helpers."""
import os
import json
import logging
from datetime import datetime
from pathlib import Path
import joblib


def ensure_dir(path):
    Path(path).mkdir(parents=True, exist_ok=True)


def now_tag():
    return datetime.utcnow().strftime("%Y-%m-%dT%H%M%SZ")


def save_joblib(obj, path):
    ensure_dir(os.path.dirname(path))
    joblib.dump(obj, path)


def load_joblib(path):
    return joblib.load(path)


def setup_logging(logfile='outputs/logs/app.log'):
    ensure_dir(os.path.dirname(logfile))
    logging.basicConfig(
        level=logging.INFO,
        format='[%(asctime)s] %(levelname)s %(message)s',
        handlers=[
            logging.FileHandler(logfile),
            logging.StreamHandler()
        ]
    )
    return logging.getLogger()
