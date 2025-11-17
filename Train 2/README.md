# Crowd Control Models: Training & Serving

This project trains LightGBM models for crowd arrival forecasting, risk classification, and action recommendation, and serves real-time inference via FastAPI with streaming and alerts.

## Quickstart

1) Create venv and install

```bash
python -m venv .venv
. .venv/Scripts/activate  # Windows PowerShell: .venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

2) Train on your dataset

```bash
python train.py --data "D:\\Jushita\\Projects\\Amazon\\dataset\\crowd_simulation_bukitjalil_450k_NEW.xlsx" --outputs outputs --num_boost_round 1000 --early_stopping_rounds 100 --cv 0
```

Artifacts saved to `outputs/`: `preprocessor.pkl`, `arrival_model.pkl`, `risk_model.pkl`, `action_model.pkl`, metadata JSON, and evaluation CSVs.

3) Start API server

```bash
uvicorn app:app --host 0.0.0.0 --port 8000
```

4) Streaming simulator (sends lines to /infer_stream)

```bash
python stream_simulator.py --data "D:\\Jushita\\Projects\\Amazon\\dataset\\crowd_simulation_bukitjalil_450k_NEW.xlsx" --rate 25
```

5) Incremental update (mini-batch retrain)

```bash
python incremental_update.py --new_data path_to_new_labeled.xlsx --outputs outputs
```

## Config
Default thresholds, bucket sizes, and hyperparameters are in `config.yaml`.

## Health & Metrics
- Health: GET /healthz
- Metrics: GET /metrics (Prometheus-friendly)

## Notes
- Splits are by `Event_ID` to avoid leakage.
- Feature cache uses Redis if available, else in-memory fallback.


