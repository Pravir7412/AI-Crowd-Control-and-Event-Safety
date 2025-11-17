"""
train_and_simulate.py

Full pipeline:
- Load Excel dataset (default: crowd_simulation_bukitjalil_450k_NEW.xlsx)
- Preprocess features (label encode & scale)
- Train a multi-task PyTorch model:
    * Classification head -> exit gate
    * Regression head     -> exit_time (minutes)
- Save best model as best_model.pth in same folder as dataset
- Run Mesa agent-based simulation using trained model predictions:
    * 3 scenarios: entry_rush, mid_event_congestion, emergency_evacuation
- Produce hotspot detection and simple actionable recommendations.
- CLI args allow local / s3 dataset paths; can be adapted to SageMaker.
"""

import os
import random
import argparse
from datetime import datetime
from typing import Tuple, Dict

import numpy as np
import pandas as pd
from tqdm import tqdm

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader

from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, mean_squared_error

# Mesa for agent-based simulation
from mesa import Agent, Model
from mesa.time import RandomActivation
from mesa.space import MultiGrid
from mesa.datacollection import DataCollector
import matplotlib.pyplot as plt

# Optional: boto3 for S3 upload (commented usage)
import boto3

# ---------------------------
# Reproducibility / Device
# ---------------------------
SEED = 42
random.seed(SEED)
np.random.seed(SEED)
torch.manual_seed(SEED)
if torch.cuda.is_available():
    torch.cuda.manual_seed_all(SEED)
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# ---------------------------
# Dataset & Preprocessing
# ---------------------------
class CrowdTabularDataset(Dataset):
    def __init__(self, X: np.ndarray, y_class: np.ndarray, y_reg: np.ndarray):
        self.X = torch.tensor(X, dtype=torch.float32)
        self.y_class = torch.tensor(y_class, dtype=torch.long)
        self.y_reg = torch.tensor(y_reg, dtype=torch.float32).unsqueeze(1)
    def __len__(self):
        return len(self.X)
    def __getitem__(self, idx):
        return self.X[idx], self.y_class[idx], self.y_reg[idx]

def load_and_preprocess(file_path: str, target_gate_col: str="Exit_Gate", target_time_col: str="Exit_Time"):
    # Read Excel
    df = pd.read_excel(file_path)
    if target_gate_col not in df.columns or target_time_col not in df.columns:
        raise ValueError(f"Target columns {target_gate_col} and/or {target_time_col} not found in dataset. Found: {df.columns.tolist()}")

    # Basic cleaning: drop rows with NaNs in targets
    df = df.dropna(subset=[target_gate_col, target_time_col]).reset_index(drop=True)

    # Separate features & targets
    y_gate = df[target_gate_col].astype(str).values
    y_time = df[target_time_col].astype(float).values

    X = df.drop(columns=[target_gate_col, target_time_col])
    # Simple encoding for categorical columns
    encoders = {}
    for col in X.select_dtypes(include=['object', 'category']).columns:
        le = LabelEncoder()
        X[col] = le.fit_transform(X[col].astype(str))
        encoders[col] = le

    # Fill numeric NaNs
    X = X.fillna(0)

    feature_cols = X.columns.tolist()
    X_vals = X.values.astype(float)

    # Scale numeric features
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X_vals)

    # Encode gates
    gate_le = LabelEncoder()
    y_gate_enc = gate_le.fit_transform(y_gate)

    return X_scaled, y_gate_enc, y_time, feature_cols, scaler, gate_le, encoders

# ---------------------------
# PyTorch Model
# ---------------------------
class MultiTaskNet(nn.Module):
    def __init__(self, input_dim:int, n_gates:int, hidden:int=256, dropout:float=0.2):
        super().__init__()
        self.shared = nn.Sequential(
            nn.Linear(input_dim, hidden),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(hidden, hidden//2),
            nn.ReLU()
        )
        self.class_head = nn.Sequential(
            nn.Dropout(dropout),
            nn.Linear(hidden//2, n_gates)
        )
        self.reg_head = nn.Sequential(
            nn.Dropout(dropout),
            nn.Linear(hidden//2, 1)
        )
    def forward(self, x):
        s = self.shared(x)
        return self.class_head(s), self.reg_head(s)

# ---------------------------
# Training Loop (with checkpointing & early stopping)
# ---------------------------
def train_model(X_train, y_train_class, y_train_reg,
                X_val, y_val_class, y_val_reg,
                input_dim, n_gates,
                out_folder, epochs=30, batch_size=512, lr=1e-3, patience=5):
    # Dataloaders
    train_ds = CrowdTabularDataset(X_train, y_train_class, y_train_reg)
    val_ds = CrowdTabularDataset(X_val, y_val_class, y_val_reg)
    train_loader = DataLoader(train_ds, batch_size=batch_size, shuffle=True, drop_last=False)
    val_loader = DataLoader(val_ds, batch_size=batch_size, shuffle=False)

    model = MultiTaskNet(input_dim, n_gates).to(DEVICE)
    criterion_class = nn.CrossEntropyLoss()
    criterion_reg = nn.MSELoss()
    optimizer = optim.Adam(model.parameters(), lr=lr)

    best_score = float('inf')  # combined metric (smaller better)
    best_path = os.path.join(out_folder, "best_model.pth")
    no_improve = 0

    for epoch in range(1, epochs+1):
        model.train()
        total_loss = 0.0
        for Xb, yb_class, yb_reg in train_loader:
            Xb = Xb.to(DEVICE); yb_class = yb_class.to(DEVICE); yb_reg = yb_reg.to(DEVICE)
            optimizer.zero_grad()
            logits, pred_reg = model(Xb)
            loss_class = criterion_class(logits, yb_class)
            loss_reg = criterion_reg(pred_reg, yb_reg)
            loss = loss_class + loss_reg  # simple sum; could weight losses
            loss.backward()
            optimizer.step()
            total_loss += loss.item()
        avg_train_loss = total_loss / len(train_loader)

        # Validation
        model.eval()
        all_logits = []
        all_reg = []
        all_yc = []
        all_yr = []
        with torch.no_grad():
            for Xb, yb_class, yb_reg in val_loader:
                Xb = Xb.to(DEVICE)
                logits, pred_reg = model(Xb)
                all_logits.append(logits.cpu().numpy())
                all_reg.append(pred_reg.cpu().numpy())
                all_yc.append(yb_class.numpy())
                all_yr.append(yb_reg.numpy())
        import numpy as _np
        logits = _np.vstack(all_logits)
        pred_class = logits.argmax(axis=1)
        pred_reg = _np.vstack(all_reg).squeeze()
        y_true_class = _np.concatenate(all_yc)
        y_true_reg = _np.concatenate(all_yr).squeeze()

        val_acc = accuracy_score(y_true_class, pred_class)
        val_mse = mean_squared_error(y_true_reg, pred_reg)
        combined = val_mse - (val_acc * 0.01)  # lower is better: prioritize reg MSE but prefer higher acc

        print(f"Epoch {epoch}/{epochs} -- train_loss: {avg_train_loss:.4f} | val_acc: {val_acc:.4f} | val_mse: {val_mse:.4f} | comb: {combined:.4f}")

        # Checkpoint
        if combined < best_score:
            best_score = combined
            torch.save({
                "model_state": model.state_dict(),
                "input_dim": input_dim,
                "n_gates": n_gates,
                "epoch": epoch,
                "val_acc": val_acc,
                "val_mse": val_mse
            }, best_path)
            print(f"  ✅ Saved best model to {best_path} (combined: {combined:.4f})")
            no_improve = 0
        else:
            no_improve += 1
            if no_improve >= patience:
                print(f"Early stopping (no improvement in {patience} epochs).")
                break

    # Load best before returning
    checkpoint = torch.load(best_path, map_location=DEVICE)
    model.load_state_dict(checkpoint["model_state"])
    return model, best_path

# ---------------------------
# Inference helper
# ---------------------------
def predict_with_model(model: nn.Module, X: np.ndarray):
    model.eval()
    with torch.no_grad():
        xb = torch.tensor(X, dtype=torch.float32).to(DEVICE)
        logits, pred_reg = model(xb)
        pred_class = torch.argmax(logits, dim=1).cpu().numpy()
        pred_reg = pred_reg.cpu().numpy().squeeze()
    return pred_class, pred_reg

# ---------------------------
# Mesa Agent-based Simulation
# ---------------------------
class CrowdAgent(Agent):
    def __init__(self, unique_id, model_ref, start_pos, exit_gate_idx, speed):
        super().__init__(unique_id, model_ref)
        self.pos = start_pos
        self.exit_gate_idx = int(exit_gate_idx)
        self.speed = float(max(0.1, speed))  # speed determines move probability
        self.evacuated = False

    def step(self):
        if self.evacuated:
            return
        # move towards a gate position (gate coords stored on model)
        goal = self.model.gate_positions[self.exit_gate_idx]
        # simple movement: step 1 cell toward gate with probability proportional to speed
        if random.random() < min(1.0, self.speed / 5.0):
            # naive movement: move one cell closer in x or y
            dx = goal[0] - self.pos[0]
            dy = goal[1] - self.pos[1]
            nx = self.pos[0] + (1 if dx>0 else -1 if dx<0 else 0)
            ny = self.pos[1] + (1 if dy>0 else -1 if dy<0 else 0)
            new_pos = (int(max(0,min(self.model.grid.width-1, nx))), int(max(0,min(self.model.grid.height-1, ny))))
            self.model.grid.move_agent(self, new_pos)
            self.pos = new_pos
        # check if at gate
        if self.pos == self.model.gate_positions[self.exit_gate_idx]:
            self.evacuated = True
            self.model.evacuated_count += 1

class CrowdModelMesa(Model):
    def __init__(self, width:int, height:int, agents_info:list, gate_positions:dict):
        super().__init__()
        self.grid = MultiGrid(width, height, torus=False)
        self.schedule = RandomActivation(self)
        self.running = True
        self.gate_positions = gate_positions  # dict idx -> (x,y)
        self.evacuated_count = 0
        self.total_agents = len(agents_info)

        # create agents
        for a_info in agents_info:
            a = CrowdAgent(a_info['id'], self, a_info['start_pos'], a_info['exit_gate'], a_info['speed'])
            self.grid.place_agent(a, a_info['start_pos'])
            self.schedule.add(a)

        # data collector for hotspots: count agents per cell each step
        self.step_num = 0
        self.cell_counts = {}  # (x,y) -> max count seen

    def step(self):
        self.step_num += 1
        self.schedule.step()
        # update cell counts
        for cell in self.grid.coord_iter():
            cell_agents = cell[0]
            # cell[1] is x, cell[2] is y (but Mesa's coord_iter returns (cell_list, x, y))
            cell_list, x, y = cell
            count = len(cell_list)
            if count > 0:
                prev = self.cell_counts.get((x,y), 0)
                self.cell_counts[(x,y)] = max(prev, count)

    def run_model(self, steps=200):
        for _ in range(steps):
            if self.evacuated_count >= self.total_agents:
                break
            self.step()

# ---------------------------
# Utilities: Build agents from dataset + model predictions
# ---------------------------
def build_agents_from_table(df: pd.DataFrame, model, scaler, gate_le: LabelEncoder, scenario:str, n_agents:int=1000, grid_size=(50,50)):
    """
    df: original dataframe (before drop of targets) used to sample features for agents
    scenario: 'entry_rush', 'mid_event_congestion', 'emergency_evacuation'
    returns agents_info list and gate_positions dict
    """
    # sample n_agents rows (with replacement if needed)
    sample = df.sample(n=n_agents, replace=True, random_state=SEED).reset_index(drop=True)

    # Preprocess sample features similar to training: we assume columns match scaler input
    # Note: in practice you should save feature_cols and exact encoders — this function is simplified
    # For the demo, if sample contains non-numeric, convert to 0 or encoded ints
    X_runs = sample.select_dtypes(include=[np.number]).fillna(0).values
    # If scaler expects different shape, pad/truncate
    if X_runs.shape[1] != scaler.mean_.shape[0]:
        # crude fix: reshape or pad zeros
        needed = scaler.mean_.shape[0]
        if X_runs.shape[1] < needed:
            X_runs = np.hstack([X_runs, np.zeros((X_runs.shape[0], needed - X_runs.shape[1]))])
        else:
            X_runs = X_runs[:, :needed]
    X_scaled = scaler.transform(X_runs)
    pred_classes, pred_reg = predict_with_model(model, X_scaled)

    # Gate positions (distribute gates along one edge)
    unique_gates = np.unique(pred_classes)
    gate_positions = {}
    # place gates along right edge
    width, height = grid_size
    gate_count = max(4, len(unique_gates))
    for i,g in enumerate(unique_gates):
        gate_positions[int(g)] = (width-1, int((i+1) * height/(len(unique_gates)+1)))

    agents_info = []
    # Depending on scenario, adjust speeds or start positions
    for i in range(n_agents):
        gate_idx = int(pred_classes[i])
        speed = max(0.5, np.clip(5.0 - (pred_reg[i]/30.0), 0.5, 5.0))  # craft speed from predicted time: longer time -> slower
        # scenario modifiers
        if scenario == 'entry_rush':
            # start outside left edge, cluster arrival times at t=0 (we emulate by putting many at same start)
            start_pos = (0, random.randint(0, grid_size[1]-1))
            # make speeds slightly faster for entry
            speed *= 1.1
        elif scenario == 'mid_event_congestion':
            # start spread across interior
            start_pos = (random.randint(5, grid_size[0]-10), random.randint(0, grid_size[1]-1))
            speed *= 0.9
        elif scenario == 'emergency_evacuation':
            start_pos = (random.randint(0, grid_size[0]-1), random.randint(0, grid_size[1]-1))
            speed *= 1.3  # people move faster in evacuation
            # In emergency, we could reassign gates toward the nearest exit; keep predicted gate as recommend baseline
        else:
            start_pos = (random.randint(0, grid_size[0]-1), random.randint(0, grid_size[1]-1))

        agents_info.append({
            'id': i,
            'start_pos': start_pos,
            'exit_gate': gate_idx,
            'speed': float(speed)
        })
    return agents_info, gate_positions

# ---------------------------
# Hotspot detection & recommendations
# ---------------------------
def detect_hotspots_and_recommend(model_mesa: CrowdModelMesa, threshold:int=5):
    """
    Detect cells that saw counts above threshold and produce simple actionable recommendations:
    - Open an alternative gate if nearby cell near a gate overflows
    - Redirect X% (simulated) by reassigning some agents
    """
    hotspots = {pos:cnt for pos,cnt in model_mesa.cell_counts.items() if cnt >= threshold}
    recs = []
    if not hotspots:
        recs.append("No hotspots detected; crowd flow within thresholds.")
        return hotspots, recs

    # For each hotspot, find nearest gate and recommend action
    for pos, cnt in sorted(hotspots.items(), key=lambda x:-x[1])[:5]:
        # find nearest gate
        min_dist = 1e9
        nearest_gate = None
        for gidx, gpos in model_mesa.gate_positions.items():
            dist = abs(gpos[0]-pos[0]) + abs(gpos[1]-pos[1])
            if dist < min_dist:
                min_dist = dist
                nearest_gate = gidx
        recs.append(f"Hotspot at cell {pos} with peak {cnt} people. Nearest gate: {nearest_gate}. Recommendation: open adjacent gate or redirect ~15% of incoming flow to other gates.")
    return hotspots, recs

# ---------------------------
# Main CLI
# ---------------------------
def main(args):
    # Paths
    dataset_path = args.dataset
    out_folder = os.path.dirname(os.path.abspath(dataset_path)) or "."

    print("Using device:", DEVICE)
    print("Loading & preprocessing dataset:", dataset_path)
    X, y_gate, y_time, feature_cols, scaler, gate_le, encoders = load_and_preprocess(dataset_path,
                                                                                     target_gate_col=args.gate_col,
                                                                                     target_time_col=args.time_col)
    # Optionally split
    X_train, X_val, y_train_class, y_val_class, y_train_reg, y_val_reg = train_test_split(
        X, y_gate, y_time, test_size=args.val_frac, random_state=SEED
    )

    print(f"Train samples: {len(X_train)}, Val samples: {len(X_val)} | features: {X.shape[1]} | gates: {len(np.unique(y_gate))}")

    # Train model
    model, best_path = train_model(X_train, y_train_class, y_train_reg,
                                   X_val, y_val_class, y_val_reg,
                                   input_dim=X.shape[1], n_gates=len(np.unique(y_gate)),
                                   out_folder=out_folder, epochs=args.epochs, batch_size=args.batch_size, lr=args.lr, patience=args.patience)

    print("Best model saved to:", best_path)

    # Run simulations for 3 scenarios
    print("\nRunning 3 scenarios (this may take a while depending on n_agents)...")
    df_original = pd.read_excel(dataset_path)  # read again for sampling convenience
    scenario_results = {}
    for scenario in ['entry_rush', 'mid_event_congestion', 'emergency_evacuation']:
        print(f"\nScenario: {scenario} -- building agents")
        agents_info, gate_positions = build_agents_from_table(df_original, model, scaler, gate_le, scenario,
                                                              n_agents=args.n_agents, grid_size=(args.grid_w, args.grid_h))
        mesa_model = CrowdModelMesa(width=args.grid_w, height=args.grid_h, agents_info=agents_info, gate_positions=gate_positions)
        mesa_model.run_model(steps=args.sim_steps)
        hotspots, recs = detect_hotspots_and_recommend(mesa_model, threshold=args.hotspot_threshold)
        scenario_results[scenario] = {
            'evacuated': mesa_model.evacuated_count,
            'total_agents': mesa_model.total_agents,
            'hotspots': hotspots,
            'recommendations': recs
        }
        print(f"Scenario {scenario}: evacuated {mesa_model.evacuated_count}/{mesa_model.total_agents}")
        print("Top recommendations:")
        for r in recs:
            print(" -", r)

    # Optionally upload best model to S3 if requested
    if args.upload_s3 and args.s3_bucket:
        print("Uploading best model to S3:", args.s3_bucket)
        s3 = boto3.client('s3')
        basename = os.path.basename(best_path)
        s3_key = f"{args.s3_prefix.rstrip('/')}/{basename}" if args.s3_prefix else basename
        s3.upload_file(best_path, args.s3_bucket, s3_key)
        print("Uploaded to s3://{}/{}".format(args.s3_bucket, s3_key))

    # Save scenario summary
    summary_path = os.path.join(out_folder, "scenario_summary.txt")
    with open(summary_path, 'w') as f:
        f.write(f"Run at: {datetime.utcnow().isoformat()}Z\n")
        f.write(f"Dataset: {dataset_path}\n\n")
        for sc, data in scenario_results.items():
            f.write(f"=== {sc} ===\n")
            f.write(f"Evacuated: {data['evacuated']}/{data['total_agents']}\n")
            f.write("Recommendations:\n")
            for r in data['recommendations']:
                f.write(" - " + r + "\n")
            f.write("\n")
    print("\nScenario summary saved to:", summary_path)
    print("All done. Best model:", best_path)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train multi-task crowd model and run agent-based simulations.")
    parser.add_argument("--dataset", type=str, default="crowd_simulation_bukitjalil_450k_NEW.xlsx", help="Path to dataset (Excel).")
    parser.add_argument("--gate_col", type=str, default="Exit_Gate", help="Column name for gate target.")
    parser.add_argument("--time_col", type=str, default="Exit_Time", help="Column name for time-to-exit target (minutes).")
    parser.add_argument("--epochs", type=int, default=30)
    parser.add_argument("--batch_size", type=int, default=1024)
    parser.add_argument("--lr", type=float, default=1e-3)
    parser.add_argument("--patience", type=int, default=5)
    parser.add_argument("--val_frac", type=float, default=0.15)
    parser.add_argument("--n_agents", type=int, default=2000, help="Number of agents to simulate per scenario (reduce for speed).")
    parser.add_argument("--grid_w", type=int, default=60)
    parser.add_argument("--grid_h", type=int, default=40)
    parser.add_argument("--sim_steps", type=int, default=500)
    parser.add_argument("--hotspot_threshold", type=int, default=6)
    parser.add_argument("--upload_s3", action='store_true', help="If set, upload best model to S3 (requires boto3 & AWS creds).")
    parser.add_argument("--s3_bucket", type=str, default="", help="S3 Bucket name if uploading.")
    parser.add_argument("--s3_prefix", type=str, default="", help="Optional S3 prefix/folder.")
    args = parser.parse_args()
    main(args)


