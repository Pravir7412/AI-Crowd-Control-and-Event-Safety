import os
import time
from typing import Dict, Tuple

try:
	import redis  # type: ignore
except Exception:  # pragma: no cover
	redis = None


class FeatureCache:
	def __init__(self, redis_url: str | None = None, ttl_seconds: int = 7200):
		self.ttl = ttl_seconds
		self.client = None
		if redis_url and redis is not None:
			try:
				self.client = redis.from_url(redis_url)
			except Exception:
				self.client = None
		self.memory: Dict[str, Tuple[float, float, float, float, float]] = {}

	def _key(self, event_id: str, gate_id: str, bucket: str) -> str:
		return f"feat:{event_id}:{gate_id}:{bucket}"

	def set_aggregates(self, event_id: str, gate_id: str, bucket: str, sums: Dict[str, float]) -> None:
		payload = ",".join(str(sums.get(k, 0.0)) for k in ["Actual_Arrivals", "Expected_Arrivals", "Queue_Length", "Density", "count"])
		key = self._key(event_id, gate_id, bucket)
		if self.client is not None:
			self.client.setex(key, self.ttl, payload)
		else:
			self.memory[key] = (time.time(), *[float(x) for x in payload.split(",")])

	def get_aggregates(self, event_id: str, gate_id: str, bucket: str) -> Dict[str, float]:
		key = self._key(event_id, gate_id, bucket)
		if self.client is not None:
			val = self.client.get(key)
			if not val:
				return {}
			parts = [float(x) for x in val.decode().split(",")]
		else:
			val = self.memory.get(key)
			if not val:
				return {}
			parts = list(val[1:])
		return {
			"Actual_Arrivals_sum": parts[0],
			"Expected_Arrivals_sum": parts[1],
			"Queue_Length_sum": parts[2],
			"Density_sum": parts[3],
			"count": parts[4],
		}



