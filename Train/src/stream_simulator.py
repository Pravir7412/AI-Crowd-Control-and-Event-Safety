"""Small script to simulate live stream sending to /infer_stream endpoint."""
import requests
import time
import pandas as pd


def run_simulator(file_path, url='http://localhost:8000/infer_stream', delay=0.1):
    if file_path.endswith('.csv'):
        df = pd.read_csv(file_path)
    else:
        df = pd.read_excel(file_path)
    for _, row in df.iterrows():
        payload = row.to_dict()
        try:
            r = requests.post(url, json=payload, timeout=5)
            print('resp', r.json())
        except Exception as e:
            print('error', e)
        time.sleep(delay)

if __name__ == '__main__':
    run_simulator('data_sample/small_sample.csv')
