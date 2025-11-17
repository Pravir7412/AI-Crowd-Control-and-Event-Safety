"""Small feature store supporting Redis with in-memory fallback.
Stores per-gate aggregates for last X minutes. Keyed by gate and time window.
"""
import time
import json
from collections import defaultdict, deque
try:
    import redis
except Exception:
    redis = None


class RedisFeatureStore:
    def __init__(self, url, enabled=False):
        self.enabled = enabled and redis is not None
        self.url = url
        if self.enabled:
            self.client = redis.from_url(url)
        else:
            self.client = None
        # in-memory fallback
        self.local = defaultdict(lambda: defaultdict(deque))

    def update(self, gate_id, timestamp, value, bucket_minutes=5):
        key = f"gate:{gate_id}:b{bucket_minutes}"
        point = {'t': int(timestamp), 'v': float(value)}
        if self.enabled:
            self.client.lpush(key, json.dumps(point))
            self.client.ltrim(key, 0, 1000)
        else:
            dq = self.local[gate_id][bucket_minutes]
            dq.appendleft(point)
            while len(dq) > 1000:
                dq.pop()

    def get_aggregates(self, gate_id, bucket_minutes=5):
        if self.enabled:
            key = f"gate:{gate_id}:b{bucket_minutes}"
            raw = self.client.lrange(key, 0, -1)
            arr = [json.loads(x) for x in raw]
        else:
            arr = list(self.local[gate_id][bucket_minutes])
        if not arr:
            return {'sum':0,'mean':0,'count':0}
        vals = [p['v'] for p in arr]
        return {'sum': sum(vals), 'mean': sum(vals)/len(vals), 'count': len(vals)}
