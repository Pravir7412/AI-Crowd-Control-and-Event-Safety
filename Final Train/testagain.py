import tkinter as tk
from tkinter import filedialog, messagebox
import pandas as pd
import datetime
import matplotlib.pyplot as plt
import os
import numpy as np

# === Simulation Logic ===
def run_simulation(event_name, event_type, attendees, gates_file, start_time,
                   rain=False, extra_gate=None, transport_delay=0):
    try:
        gates_df = pd.read_excel(gates_file)
    except:
        messagebox.showerror("Error", "Could not read gates file.")
        return None, None, None, None

    if 'capacity' not in gates_df.columns:
        gates_df['capacity'] = 30  # default throughput

    # Rain impact
    if rain:
        gates_df['capacity'] = (gates_df['capacity'] * 0.7).astype(int)

    # Add temporary gate
    if extra_gate:
        gates_df.loc[len(gates_df)] = [f"Temp Gate", "temp", int(extra_gate)]

    total_attendees = int(attendees)
    ARRIVAL_WINDOW_MIN = 90
    minutes = np.arange(-ARRIVAL_WINDOW_MIN, 1, 1)

    # Shift arrivals if transport delayed
    alpha = 5.0
    x = np.linspace(0, 1, len(minutes))
    pdf = (x**(alpha-1))
    pdf = pdf / pdf.sum()
    arrivals = np.random.poisson(lam=pdf * total_attendees)
    if transport_delay > 0:
        arrivals = np.roll(arrivals, transport_delay)  # shift arrivals later

    queues = {g: 0 for g in gates_df['gate_id']}
    processing_rate = {row['gate_id']: int(row['capacity']) for _, row in gates_df.iterrows()}
    queue_time_series = []

    for t_idx, minute in enumerate(minutes):
        new_people = int(arrivals[t_idx])
        share = gates_df['capacity'] / gates_df['capacity'].sum()
        assigned = (share * new_people).astype(int).to_dict()

        total_queue = 0
        for gid in queues:
            incoming = assigned.get(gid, 0)
            processed = min(processing_rate[gid], queues[gid] + incoming)
            queues[gid] = queues[gid] + incoming - processed
            total_queue += queues[gid]

        queue_time_series.append([minute, start_time + datetime.timedelta(minutes=int(minute)),
                                  new_people, total_queue])

    queue_df = pd.DataFrame(queue_time_series, columns=["minute","time","new_arrivals","total_queue"])
    peak_queue = queue_df['total_queue'].max()
    queued_at_start = queue_df.loc[queue_df['minute']==0,'total_queue'].iloc[0]

    # Recommendations
    recs = []
    if peak_queue > 100:
        recs.append(f"Peak queue {peak_queue}. Open more gates or add staff.")
    if queued_at_start / total_attendees > 0.4:
        recs.append(f"At start, {queued_at_start} still queued. Delay event or add throughput.")
    if not recs:
        recs.append("No major congestion predicted.")

    return queue_df, peak_queue, recs, gates_df

# === GUI Functions ===
def browse_file(entry):
    file_path = filedialog.askopenfilename(filetypes=[("Excel files","*.xlsx")])
    entry.delete(0, tk.END)
    entry.insert(0, file_path)

def start_simulation():
    run_with_inputs()

def run_with_inputs():
    event_name = event_name_entry.get()
    event_type = event_type_entry.get()
    attendees = attendees_entry.get()
    gates_file = gates_file_entry.get()
    start_time_str = start_time_entry.get()

    try:
        attendees = int(attendees)
        start_time = datetime.datetime.strptime(start_time_str, "%Y-%m-%d %H:%M")
    except:
        messagebox.showerror("Error", "Invalid attendees or start time format.")
        return

    rain = rain_var.get()
    extra_gate = extra_gate_entry.get()
    extra_gate = int(extra_gate) if extra_gate else None
    delay = delay_entry.get()
    delay = int(delay) if delay else 0

    queue_df, peak_queue, recs, gates_df = run_simulation(event_name, event_type, attendees,
                                                          gates_file, start_time,
                                                          rain=rain, extra_gate=extra_gate,
                                                          transport_delay=delay)
    if queue_df is None: return

    # Show results
    result_text.delete(1.0, tk.END)
    result_text.insert(tk.END, f"Event: {event_name} ({event_type})\n")
    result_text.insert(tk.END, f"Attendees: {attendees}\n")
    result_text.insert(tk.END, f"Peak Queue: {peak_queue}\n\n")
    result_text.insert(tk.END, "Recommendations:\n")
    for r in recs:
        result_text.insert(tk.END, "- " + r + "\n")

    # Plot
    plt.figure(figsize=(8,4))
    plt.plot(queue_df["time"], queue_df["total_queue"])
    plt.title("Total Queue Over Time")
    plt.xlabel("Time")
    plt.ylabel("Queued People")
    plt.grid(True)
    plt.show()

    # Export
    out_dir = "crowd_outputs"
    os.makedirs(out_dir, exist_ok=True)
    queue_df.to_csv(os.path.join(out_dir,"queue_timeseries.csv"), index=False)
    gates_df.to_csv(os.path.join(out_dir,"gates_report.csv"), index=False)
    pd.DataFrame([{"event":event_name,"attendees":attendees,"peak_queue":peak_queue}])\
        .to_csv(os.path.join(out_dir,"plan_summary.csv"), index=False)

    messagebox.showinfo("Exported", f"Reports saved to {out_dir}/")

# === Main Window ===
root = tk.Tk()
root.title("AI Crowd Control Simulator")

tk.Label(root, text="Event Name").grid(row=0, column=0)
event_name_entry = tk.Entry(root); event_name_entry.grid(row=0, column=1)

tk.Label(root, text="Event Type").grid(row=1, column=0)
event_type_entry = tk.Entry(root); event_type_entry.grid(row=1, column=1)

tk.Label(root, text="Number of Attendees").grid(row=2, column=0)
attendees_entry = tk.Entry(root); attendees_entry.grid(row=2, column=1)

tk.Label(root, text="Gates Excel File").grid(row=3, column=0)
gates_file_entry = tk.Entry(root, width=30); gates_file_entry.grid(row=3, column=1)
tk.Button(root, text="Browse", command=lambda: browse_file(gates_file_entry)).grid(row=3, column=2)

tk.Label(root, text="Event Start Time (YYYY-MM-DD HH:MM)").grid(row=4, column=0)
start_time_entry = tk.Entry(root); start_time_entry.grid(row=4, column=1)

# Real-time changes
rain_var = tk.BooleanVar()
tk.Checkbutton(root, text="Rain (30% less capacity)", variable=rain_var).grid(row=5, column=0, sticky="w")

tk.Label(root, text="Extra Temporary Gate Capacity").grid(row=6, column=0)
extra_gate_entry = tk.Entry(root); extra_gate_entry.grid(row=6, column=1)

tk.Label(root, text="Transport Delay (minutes)").grid(row=7, column=0)
delay_entry = tk.Entry(root); delay_entry.grid(row=7, column=1)

# Buttons
tk.Button(root, text="Run Simulation", command=start_simulation).grid(row=8, column=0, columnspan=2, pady=10)
tk.Button(root, text="Update with Changes", command=run_with_inputs).grid(row=9, column=0, columnspan=2)

result_text = tk.Text(root, height=12, width=50)
result_text.grid(row=10, column=0, columnspan=3)

root.mainloop()
