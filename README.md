# Crowd Simulation ML Project

## Quickstart

1. Create virtualenv and install:

```bash
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
```

2. Place your Excel dataset (you already uploaded one). Example path:

`D:\Jushita\Projects\Amazon\crowd_simulation_bukitjalil_450k_NEW.xlsx`

3. Train models (example):

```bash
python -m src.train --data "D:\Jushita\Projects\Amazon\crowd_simulation_bukitjalil_450k_NEW.xlsx" --config configs/config.yaml
```

Console prints will include training progress and best iterations, e.g.:

```
[Arrival Model] Training for up to 1000 rounds with early stopping(100)... Best iteration: 324
[Arrival Model] Validation MAE=12.4, RMSE=15.7
[Risk Model] Accuracy=0.892, F1=0.86, Confusion matrix saved to outputs/
Server started on http://0.0.0.0:8000 (model_version=2025-09-16_v1)
```

4. Start serving:

```bash
uvicorn src.serve:app --host 0.0.0.0 --port 8000
```

5. Send a streaming request (single row):

```bash
curl -X POST "http://localhost:8000/infer_stream" -H "Content-Type: application/json" -d @sample_row.json
```

6. For incremental updates, run `src/incremental_update.py` functions.

## Configs & defaults
- Buckets: 1,5,15 minute
- Threshold for alerts: 0.85
- Target latency: 200ms
- LightGBM early stopping: 100 rounds

## Safety & performance notes
- Split by Event_ID to avoid leakage.
- Validate new data before retraining (schema + ranges).
- Use model versioning and keep old models for quick rollback.
- For latency: ensure models are warmed up and avoid heavy serialization per request.
