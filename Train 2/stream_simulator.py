import argparse
import time
import json
import requests
import pandas as pd


def main():
	p = argparse.ArgumentParser()
	p.add_argument("--data", required=True)
	p.add_argument("--url", default="http://127.0.0.1:8000/infer_stream")
	p.add_argument("--rate", type=float, default=10, help="rows per second")
	args = p.parse_args()

	df = pd.read_excel(args.data, engine="openpyxl") if args.data.lower().endswith(".xlsx") else pd.read_csv(args.data)
	interval = 1.0 / max(args.rate, 1e-6)
	for _, row in df.iterrows():
		payload = row.to_dict()
		st = time.time()
		try:
			r = requests.post(args.url, json=payload, timeout=5)
			print(r.json())
		except Exception as e:
			print("error", e)
			time.sleep(1)
		continue
		elapsed = time.time() - st
		if elapsed < interval:
			time.sleep(interval - elapsed)


if __name__ == "__main__":
	main()




