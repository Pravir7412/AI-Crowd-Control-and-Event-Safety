# Save as: generate_crowd_450k.py
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
import random

# --- Reproducibility ---
random.seed(42)
np.random.seed(42)

# --- Parameters ---
rows_per_scenario = 90000
scenarios = ["Entry", "MidEvent", "Exit", "Emergency", "Disruption"]
total_rows = rows_per_scenario * len(scenarios)
n_persons = 30000
start_date = datetime(2025, 9, 20, 14, 0)
minutes_span = 6 * 60  # 6-hour window

gates_zones = [
    "Gate A", "Gate B", "Gate C", "Gate D", "Gate E",
    "FoodCourt1", "FoodCourt2", "Restroom1", "Restroom2",
    "Entrance Plaza", "UpperDeckZone1", "LowerDeckZone1", "VIP Lounge",
    "Exit A", "Exit B"
]

seat_zones = ["VIP", "LowerDeck", "UpperDeck", "Zone1", "Zone2", "Zone3"]
transport_modes = ["Car", "Train", "Bus", "Walk"]
weather_states = ["Clear", "Rain", "Storm"]
recommended_actions = [
    "OpenExtraGate", "DelayStart", "RedirectCrowd",
    "DeployStaff", "AdviseShelter", "CloseGate"
]

# --- Person assignment ---
person_ids = np.arange(1, n_persons + 1)
person_seatz = np.random.choice(
    seat_zones, size=n_persons,
    p=[0.05, 0.3, 0.25, 0.15, 0.15, 0.1]
)
person_transport = np.random.choice(
    transport_modes, size=n_persons,
    p=[0.35, 0.25, 0.15, 0.25]
)

# --- Generate dataset ---
rows = []
for scenario in scenarios:
    for i in range(rows_per_scenario):
        pid = int(np.random.choice(person_ids))
        seat = person_seatz[pid - 1]
        tmode = person_transport[pid - 1]

        # --- Time distribution ---
        if scenario == "Entry":
            minute_offset = np.random.randint(0, 120)
        elif scenario == "MidEvent":
            minute_offset = np.random.randint(120, 240)
        elif scenario == "Exit":
            minute_offset = np.random.randint(240, 360)
        elif scenario == "Emergency":
            minute_offset = np.random.randint(180, 360)
        else:  # Disruption
            minute_offset = np.random.randint(0, minutes_span)
        timestamp = start_date + timedelta(minutes=int(minute_offset))

        # --- Zone selection ---
        if scenario == "Entry":
            zone = np.random.choice(
                ["Gate A", "Gate B", "Gate C", "Gate D", "Entrance Plaza"],
                p=[0.25, 0.25, 0.2, 0.15, 0.15]
            )
        elif scenario == "Exit":
            zone = np.random.choice(
                ["Exit A", "Exit B", "Gate A", "Gate B", "LowerDeckZone1"],
                p=[0.3, 0.25, 0.2, 0.15, 0.1]
            )
        elif scenario == "MidEvent":
            zone = np.random.choice(
                ["FoodCourt1", "FoodCourt2", "Restroom1", "Restroom2", "UpperDeckZone1"],
                p=[0.25, 0.25, 0.2, 0.15, 0.15]
            )
        else:  # Emergency / Disruption
            zone = np.random.choice(gates_zones)

        # --- Gate/zone capacity ---
        if "Gate" in zone or "Entrance" in zone or "Exit" in zone:
            cap = int(max(5, np.random.normal(300, 40)))
        elif "FoodCourt" in zone or "Restroom" in zone:
            cap = int(max(5, np.random.normal(60, 10)))
        elif "UpperDeck" in zone or "LowerDeck" in zone:
            cap = int(max(5, np.random.normal(120, 20)))
        else:
            cap = int(max(5, np.random.normal(80, 15)))

        # --- Expected arrivals by scenario ---
        lam_factor = {
            "Entry": 0.9, "Exit": 0.8, "MidEvent": 0.6,
            "Emergency": 1.2, "Disruption": 0.7
        }[scenario]
        expected = max(0, int(np.random.poisson(lam=max(1, cap * lam_factor))))

        # --- Actual arrivals with spikes ---
        if np.random.rand() < 0.01:  # rare spike
            actual = expected + np.random.randint(int(0.5 * cap), int(4 * cap))
        else:
            variability = np.random.normal(0, max(1, cap * 0.2))
            actual = max(0, int(expected + variability))

        # --- Transport arrivals ---
        transport_arrival = 0
        if actual > 0:
            if tmode in ["Train", "Bus"] and np.random.rand() < 0.35:
                transport_arrival = np.random.randint(1, min(50, actual + 1))
            elif tmode == "Car" and np.random.rand() < 0.3:
                transport_arrival = np.random.randint(1, min(30, actual + 1))
            elif tmode == "Walk" and np.random.rand() < 0.2:
                transport_arrival = np.random.randint(0, min(10, actual + 1))

        # --- Queue length ---
        queue_len = max(0, int(max(0, actual - cap) + np.random.poisson(lam=cap * 0.1)))

        # --- Zone area for density ---
        if "Gate" in zone or "Entrance" in zone:
            zone_area = np.random.uniform(80, 180)
        elif "FoodCourt" in zone:
            zone_area = np.random.uniform(150, 500)
        elif "Restroom" in zone:
            zone_area = np.random.uniform(20, 60)
        elif "UpperDeck" in zone or "LowerDeck" in zone:
            zone_area = np.random.uniform(500, 3000)
        elif "VIP" in zone or "Lounge" in zone:
            zone_area = np.random.uniform(50, 200)
        else:
            zone_area = 100.0

        people_present = max(0, int(actual + queue_len + np.random.poisson(lam=cap * 0.2)))
        density = people_present / zone_area
        density = round(float(np.random.normal(density, 0.15 * max(0.1, density))), 3)
        density = max(0.0, density)

        # --- Hotspot label ---
        hotspot = 2 if (density > 3.0 or queue_len > cap * 4) else (
            1 if (density > 1.5 or queue_len > cap * 2) else 0
        )

        # --- Evacuation time ---
        evac_time = np.nan
        if scenario == "Emergency":
            gates_open = np.random.randint(1, 6)
            evac_time = int(max(
                1,
                round((people_present / (gates_open * cap + 1)) * np.random.uniform(0.8, 1.8))
            ))

        # --- Weather ---
        if scenario == "Disruption":
            weather = np.random.choice(weather_states, p=[0.4, 0.45, 0.15])
        else:
            weather = np.random.choice(weather_states, p=[0.75, 0.2, 0.05])

        # --- Recommended action ---
        if hotspot == 2:
            action = np.random.choice(["OpenExtraGate", "DeployStaff", "RedirectCrowd"])
        elif hotspot == 1:
            action = np.random.choice(["DeployStaff", "RedirectCrowd", "DelayStart"])
        elif scenario == "Disruption" and weather in ["Rain", "Storm"]:
            action = np.random.choice(["DelayStart", "AdviseShelter", "CloseGate"])
        else:
            action = np.random.choice(recommended_actions)

        rows.append({
            "Person_ID": pid,
            "Time": timestamp.strftime("%Y-%m-%d %H:%M"),
            "Scenario_Type": scenario,
            "Gate/Zone_ID": zone,
            "Seat_Zone": seat,
            "Transport_Mode": tmode,
            "Transport_Arrival": transport_arrival,
            "Weather": weather,
            "Gate_Capacity": cap,
            "Expected_Arrivals": expected,
            "Actual_Arrivals": actual,
            "Queue_Length": queue_len,
            "Density": round(density, 3),
            "Hotspot_Label": hotspot,
            "Evacuation_Time": evac_time,
            "Recommended_Action": action,
            "Venue": "Bukit Jalil Stadium"
        })

# --- Save dataset ---
df = pd.DataFrame(rows)
df.to_excel("crowd_simulation_bukitjalil_450k_NEW.xlsx",
            sheet_name="Crowd_Simulation", index=False)
print("✅ Saved crowd_simulation_bukitjalil_450k_NEW.xlsx with", len(df), "rows")
