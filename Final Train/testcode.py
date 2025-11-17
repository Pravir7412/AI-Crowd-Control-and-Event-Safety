import tkinter as tk
from tkinter import filedialog, messagebox, scrolledtext
import pandas as pd
import torch

# ----------------------------
# Load your trained model
# ----------------------------
model_path = "best_model.pth"
try:
    model = torch.load(model_path, map_location="cpu")
    model.eval()
except Exception as e:
    model = None
    print("⚠️ Could not load model:", e)

# ----------------------------
# GUI Application
# ----------------------------
class CrowdControlApp:
    def __init__(self, root):
        self.root = root
        self.root.title("AI Crowd Control & Event Safety")
        self.root.geometry("800x600")

        # Upload Button
        self.upload_btn = tk.Button(root, text="Upload Dataset", command=self.upload_dataset, font=("Arial", 12), bg="lightblue")
        self.upload_btn.pack(pady=10)

        # Scenario Buttons
        self.scenario_frame = tk.Frame(root)
        self.scenario_frame.pack(pady=10)

        tk.Label(self.scenario_frame, text="Choose Scenario:", font=("Arial", 12, "bold")).grid(row=0, column=0, columnspan=3, pady=5)

        self.entry_btn = tk.Button(self.scenario_frame, text="Entry Rush", command=lambda: self.run_scenario("entry"), width=15)
        self.entry_btn.grid(row=1, column=0, padx=5)

        self.mid_btn = tk.Button(self.scenario_frame, text="Mid-Event Congestion", command=lambda: self.run_scenario("mid"), width=20)
        self.mid_btn.grid(row=1, column=1, padx=5)

        self.evac_btn = tk.Button(self.scenario_frame, text="Emergency Evacuation", command=lambda: self.run_scenario("evac"), width=20)
        self.evac_btn.grid(row=1, column=2, padx=5)

        # Output Box
        self.output = scrolledtext.ScrolledText(root, wrap=tk.WORD, width=90, height=20, font=("Courier", 10))
        self.output.pack(pady=10)

        self.dataset = None

    def upload_dataset(self):
        file_path = filedialog.askopenfilename(filetypes=[("Excel files", "*.xlsx"), ("CSV files", "*.csv")])
        if not file_path:
            return
        try:
            if file_path.endswith(".csv"):
                self.dataset = pd.read_csv(file_path)
            else:
                self.dataset = pd.read_excel(file_path)
            messagebox.showinfo("Dataset Loaded", f"Successfully loaded: {file_path}")
        except Exception as e:
            messagebox.showerror("Error", f"Could not load dataset: {e}")

    def run_scenario(self, scenario_type):
        if self.dataset is None:
            messagebox.showwarning("No Data", "Please upload a dataset first.")
            return

        # ------------------------
        # Fake AI Logic (placeholder)
        # Replace with real inference using your model
        # ------------------------
        if scenario_type == "entry":
            risks = "⚠️ Gate A Overcrowding (7:00PM)"
            solution = "✅ Open Gate C earlier + staggered entry announcements"
        elif scenario_type == "mid":
            risks = "⚠️ Food Court Congestion (Half-time)"
            solution = "✅ Redirect 20% of attendees to Student Lounge kiosks"
        elif scenario_type == "evac":
            risks = "⚠️ Bottleneck at Exit D (Emergency Drill)"
            solution = "✅ Use Exit B & E as additional evacuation routes"

        # Display Results
        self.output.insert(tk.END, f"\n--- Scenario: {scenario_type.upper()} ---\n")
        self.output.insert(tk.END, f"Identified Risks: {risks}\n")
        self.output.insert(tk.END, f"Suggested Solution: {solution}\n")
        self.output.insert(tk.END, "-"*70 + "\n")
        self.output.see(tk.END)


# ----------------------------
# Run the App
# ----------------------------
if __name__ == "__main__":
    root = tk.Tk()
    app = CrowdControlApp(root)
    root.mainloop()
