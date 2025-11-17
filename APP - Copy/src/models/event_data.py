from dataclasses import dataclass, field
from typing import List, Optional
from datetime import datetime

@dataclass
class Gate:
    gate_id: str
    gate_name: str
    capacity_per_hour: int
    gps: Optional[str] = None

@dataclass
class EventData:
    event_name: str
    location_name: str
    expected_attendance: int
    event_start_datetime: datetime
    event_end_datetime: datetime
    gates: List[Gate] = field(default_factory=list)
