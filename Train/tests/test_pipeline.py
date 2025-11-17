"""Simple unit-test style example showing training and inference run on the small sample."""
import subprocess
import os

# These are simple example calls; run them manually in a real environment
print('1) Train on sample (dry run)')
print('python -m src.train --data data_sample/small_sample.csv --config configs/config.yaml')
print('2) Start server: uvicorn src.serve:app --reload')
print('3) Stream simulate: python -m src.stream_simulator')
