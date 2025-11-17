"""
Crowd Simulation Training Script for Bukit Jalil Concert Dataset
Trains three LightGBM models: Arrival Forecaster, Risk Classifier, and Action Recommender
"""

import os
import pandas as pd
import numpy as np
import joblib
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import mean_absolute_error, mean_squared_error, accuracy_score, f1_score, confusion_matrix
import lightgbm as lgb
from tqdm import tqdm
import warnings
warnings.filterwarnings('ignore')

# Set style for plots
plt.style.use('seaborn-v0_8')
sns.set_palette("husl")

class CrowdSimulationTrainer:
    def __init__(self, data_path: str, output_dir: str = "models"):
        """
        Initialize the trainer with dataset path and output directory
        
        Args:
            data_path: Path to the Excel file
            output_dir: Directory to save models and results
        """
        self.data_path = data_path
        self.output_dir = output_dir
        self.df = None
        self.X_train = None
        self.X_val = None
        self.X_test = None
        
        # Target variables
        self.y_arrival_train = None
        self.y_arrival_val = None
        self.y_arrival_test = None
        
        self.y_risk_train = None
        self.y_risk_val = None
        self.y_risk_test = None
        
        self.y_action_train = None
        self.y_action_val = None
        self.y_action_test = None
        
        # Models
        self.arrival_model = None
        self.risk_model = None
        self.action_model = None
        
        # Encoders
        self.risk_encoder = LabelEncoder()
        self.action_encoder = LabelEncoder()
        
        # Create output directory
        os.makedirs(output_dir, exist_ok=True)
        
    def load_and_preprocess_data(self):
        """Load Excel data and perform preprocessing"""
        print("🔄 Loading dataset...")
        
        # Load Excel file
        self.df = pd.read_excel(self.data_path, sheet_name='Crowd_Simulation')
        print(f"✅ Dataset loaded: {len(self.df):,} rows, {len(self.df.columns)} columns")
        
        # Display basic info
        print(f"\n📊 Dataset Info:")
        print(f"   Shape: {self.df.shape}")
        print(f"   Columns: {list(self.df.columns)}")
        print(f"   Memory usage: {self.df.memory_usage(deep=True).sum() / 1024**2:.2f} MB")
        
        # Check for missing values
        missing_data = self.df.isnull().sum()
        if missing_data.sum() > 0:
            print(f"\n⚠️  Missing values found:")
            for col, missing_count in missing_data[missing_data > 0].items():
                print(f"   {col}: {missing_count} ({missing_count/len(self.df)*100:.2f}%)")
        
        # Handle missing values
        self.df = self.df.fillna({
            'Transport_Arrival': 'Unknown',
            'Weather': 'Unknown',
            'Hotspot_Label': 'Low',
            'Recommended_Action': 'Monitor'
        })
        
        print("✅ Data preprocessing completed")
        
    def encode_categorical_features(self):
        """Encode categorical features"""
        print("\n🔄 Encoding categorical features...")
        
        # Categorical columns to encode
        categorical_cols = [
            'Scenario_Type', 'Gate/Zone_ID', 'Seat_Zone', 
            'Transport_Mode', 'Weather', 'Recommended_Action', 'Venue'
        ]
        
        # Create encoded versions
        for col in categorical_cols:
            if col in self.df.columns:
                # Use label encoding for simplicity
                le = LabelEncoder()
                self.df[f'{col}_encoded'] = le.fit_transform(self.df[col].astype(str))
                
                # Save encoder for later use
                joblib.dump(le, os.path.join(self.output_dir, f'{col}_encoder.pkl'))
                print(f"   ✅ Encoded {col}: {len(le.classes_)} unique values")
        
        print("✅ Categorical encoding completed")
        
    def prepare_features_and_targets(self):
        """Prepare feature matrix and target variables"""
        print("\n🔄 Preparing features and targets...")
        
        # Feature columns (excluding targets and original categorical columns)
        feature_cols = [
            'Person_ID', 'Time', 'Scenario_Type_encoded', 'Gate/Zone_ID_encoded',
            'Seat_Zone_encoded', 'Transport_Mode_encoded', 'Transport_Arrival',
            'Weather_encoded', 'Gate_Capacity', 'Expected_Arrivals', 
            'Queue_Length', 'Density', 'Evacuation_Time', 'Venue_encoded'
        ]
        
        # Filter existing columns
        feature_cols = [col for col in feature_cols if col in self.df.columns]
        
        # Create feature matrix
        X = self.df[feature_cols].copy()
        
        # Convert Time to numeric (if it's not already)
        if X['Time'].dtype == 'object':
            X['Time'] = pd.to_datetime(X['Time']).astype(int) / 10**9  # Convert to seconds
        
        # Handle Transport_Arrival (might be categorical)
        if X['Transport_Arrival'].dtype == 'object':
            le_transport = LabelEncoder()
            X['Transport_Arrival'] = le_transport.fit_transform(X['Transport_Arrival'].astype(str))
            joblib.dump(le_transport, os.path.join(self.output_dir, 'Transport_Arrival_encoder.pkl'))
        
        # Prepare targets
        y_arrival = self.df['Actual_Arrivals'].values
        y_risk = self.risk_encoder.fit_transform(self.df['Hotspot_Label'].astype(str))
        y_action = self.action_encoder.fit_transform(self.df['Recommended_Action'].astype(str))
        
        print(f"   ✅ Features: {X.shape[1]} columns")
        print(f"   ✅ Targets prepared:")
        print(f"      - Actual_Arrivals: {len(np.unique(y_arrival))} unique values")
        print(f"      - Hotspot_Label: {len(self.risk_encoder.classes_)} classes")
        print(f"      - Recommended_Action: {len(self.action_encoder.classes_)} classes")
        
        return X, y_arrival, y_risk, y_action
    
    def split_data(self, X, y_arrival, y_risk, y_action, test_size=0.15, val_size=0.15):
        """Split data into train/validation/test sets"""
        print(f"\n🔄 Splitting data (Train: {1-test_size-val_size:.1%}, Val: {val_size:.1%}, Test: {test_size:.1%})...")
        
        # First split: train+val vs test
        X_temp, self.X_test, y_arr_temp, y_arr_test, y_risk_temp, y_risk_test, y_action_temp, y_action_test = train_test_split(
            X, y_arrival, y_risk, y_action, test_size=test_size, random_state=42
        )
        
        # Second split: train vs val
        val_size_adjusted = val_size / (1 - test_size)  # Adjust for the remaining data
        self.X_train, self.X_val, y_arr_train, y_arr_val, y_risk_train, y_risk_val, y_action_train, y_action_val = train_test_split(
            X_temp, y_arr_temp, y_risk_temp, y_action_temp, test_size=val_size_adjusted, random_state=42
        )
        
        # Store targets
        self.y_arrival_train = y_arr_train
        self.y_arrival_val = y_arr_val
        self.y_arrival_test = y_arr_test
        
        self.y_risk_train = y_risk_train
        self.y_risk_val = y_risk_val
        self.y_risk_test = y_risk_test
        
        self.y_action_train = y_action_train
        self.y_action_val = y_action_val
        self.y_action_test = y_action_test
        
        print(f"   ✅ Data split completed:")
        print(f"      - Train: {len(self.X_train):,} samples")
        print(f"      - Validation: {len(self.X_val):,} samples")
        print(f"      - Test: {len(self.X_test):,} samples")
        
    def train_arrival_forecaster(self):
        """Train LightGBM regression model for arrival forecasting"""
        print("\n🚀 Training Arrival Forecaster (Regression)...")
        
        # LightGBM parameters for regression
        params = {
            'objective': 'regression',
            'metric': ['mae', 'rmse'],
            'boosting_type': 'gbdt',
            'num_leaves': 31,
            'learning_rate': 0.05,
            'feature_fraction': 0.9,
            'bagging_fraction': 0.8,
            'bagging_freq': 5,
            'verbose': -1,
            'random_state': 42
        }
        
        # Create dataset
        train_data = lgb.Dataset(self.X_train, label=self.y_arrival_train)
        val_data = lgb.Dataset(self.X_val, label=self.y_arrival_val, reference=train_data)
        
        # Train with progress bar
        with tqdm(total=1000, desc="Training Arrival Model") as pbar:
            self.arrival_model = lgb.train(
                params,
                train_data,
                valid_sets=[val_data],
                num_boost_round=1000,
                callbacks=[
                    lgb.early_stopping(stopping_rounds=50, verbose=False),
                    lgb.log_evaluation(period=0),  # Disable default logging
                    lambda env: pbar.update(env.iteration - pbar.n)  # Custom progress update
                ]
            )
        
        # Evaluate on validation set
        y_pred_val = self.arrival_model.predict(self.X_val, num_iteration=self.arrival_model.best_iteration)
        mae = mean_absolute_error(self.y_arrival_val, y_pred_val)
        rmse = mean_squared_error(self.y_arrival_val, y_pred_val, squared=False)
        
        print(f"   ✅ Arrival Forecaster trained:")
        print(f"      - Best iteration: {self.arrival_model.best_iteration}")
        print(f"      - Validation MAE: {mae:.2f}")
        print(f"      - Validation RMSE: {rmse:.2f}")
        
        return mae, rmse
    
    def train_risk_classifier(self):
        """Train LightGBM classification model for risk prediction"""
        print("\n🚀 Training Risk Classifier (Classification)...")
        
        # LightGBM parameters for classification
        params = {
            'objective': 'multiclass',
            'num_class': len(self.risk_encoder.classes_),
            'metric': ['multi_logloss', 'multi_error'],
            'boosting_type': 'gbdt',
            'num_leaves': 31,
            'learning_rate': 0.05,
            'feature_fraction': 0.9,
            'bagging_fraction': 0.8,
            'bagging_freq': 5,
            'verbose': -1,
            'random_state': 42
        }
        
        # Create dataset
        train_data = lgb.Dataset(self.X_train, label=self.y_risk_train)
        val_data = lgb.Dataset(self.X_val, label=self.y_risk_val, reference=train_data)
        
        # Train with progress bar
        with tqdm(total=1000, desc="Training Risk Model") as pbar:
            self.risk_model = lgb.train(
                params,
                train_data,
                valid_sets=[val_data],
                num_boost_round=1000,
                callbacks=[
                    lgb.early_stopping(stopping_rounds=50, verbose=False),
                    lgb.log_evaluation(period=0),
                    lambda env: pbar.update(env.iteration - pbar.n)
                ]
            )
        
        # Evaluate on validation set
        y_pred_val = self.risk_model.predict(self.X_val, num_iteration=self.risk_model.best_iteration)
        y_pred_val_class = np.argmax(y_pred_val, axis=1)
        
        accuracy = accuracy_score(self.y_risk_val, y_pred_val_class)
        f1 = f1_score(self.y_risk_val, y_pred_val_class, average='weighted')
        
        print(f"   ✅ Risk Classifier trained:")
        print(f"      - Best iteration: {self.risk_model.best_iteration}")
        print(f"      - Validation Accuracy: {accuracy:.3f}")
        print(f"      - Validation F1-score: {f1:.3f}")
        
        return accuracy, f1, y_pred_val_class
    
    def train_action_recommender(self):
        """Train LightGBM classification model for action recommendation"""
        print("\n🚀 Training Action Recommender (Multi-class Classification)...")
        
        # LightGBM parameters for classification
        params = {
            'objective': 'multiclass',
            'num_class': len(self.action_encoder.classes_),
            'metric': ['multi_logloss', 'multi_error'],
            'boosting_type': 'gbdt',
            'num_leaves': 31,
            'learning_rate': 0.05,
            'feature_fraction': 0.9,
            'bagging_fraction': 0.8,
            'bagging_freq': 5,
            'verbose': -1,
            'random_state': 42
        }
        
        # Create dataset
        train_data = lgb.Dataset(self.X_train, label=self.y_action_train)
        val_data = lgb.Dataset(self.X_val, label=self.y_action_val, reference=train_data)
        
        # Train with progress bar
        with tqdm(total=1000, desc="Training Action Model") as pbar:
            self.action_model = lgb.train(
                params,
                train_data,
                valid_sets=[val_data],
                num_boost_round=1000,
                callbacks=[
                    lgb.early_stopping(stopping_rounds=50, verbose=False),
                    lgb.log_evaluation(period=0),
                    lambda env: pbar.update(env.iteration - pbar.n)
                ]
            )
        
        # Evaluate on validation set
        y_pred_val = self.action_model.predict(self.X_val, num_iteration=self.action_model.best_iteration)
        y_pred_val_class = np.argmax(y_pred_val, axis=1)
        
        accuracy = accuracy_score(self.y_action_val, y_pred_val_class)
        f1 = f1_score(self.y_action_val, y_pred_val_class, average='weighted')
        
        print(f"   ✅ Action Recommender trained:")
        print(f"      - Best iteration: {self.action_model.best_iteration}")
        print(f"      - Validation Accuracy: {accuracy:.3f}")
        print(f"      - Validation F1-score: {f1:.3f}")
        
        return accuracy, f1, y_pred_val_class
    
    def plot_confusion_matrix(self, y_true, y_pred, classes, title, filename):
        """Plot and save confusion matrix"""
        cm = confusion_matrix(y_true, y_pred)
        
        plt.figure(figsize=(10, 8))
        sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', 
                    xticklabels=classes, yticklabels=classes)
        plt.title(f'{title} - Confusion Matrix')
        plt.xlabel('Predicted')
        plt.ylabel('Actual')
        plt.tight_layout()
        
        # Save plot
        plt.savefig(os.path.join(self.output_dir, filename), dpi=300, bbox_inches='tight')
        plt.close()
        
        print(f"   📊 Confusion matrix saved: {filename}")
    
    def evaluate_models(self):
        """Evaluate all models on test set"""
        print("\n📊 Evaluating models on test set...")
        
        # Arrival Forecaster evaluation
        y_pred_arrival = self.arrival_model.predict(self.X_test, num_iteration=self.arrival_model.best_iteration)
        mae_test = mean_absolute_error(self.y_arrival_test, y_pred_arrival)
        rmse_test = mean_squared_error(self.y_arrival_test, y_pred_arrival, squared=False)
        
        # Risk Classifier evaluation
        y_pred_risk_proba = self.risk_model.predict(self.X_test, num_iteration=self.risk_model.best_iteration)
        y_pred_risk = np.argmax(y_pred_risk_proba, axis=1)
        risk_accuracy = accuracy_score(self.y_risk_test, y_pred_risk)
        risk_f1 = f1_score(self.y_risk_test, y_pred_risk, average='weighted')
        
        # Action Recommender evaluation
        y_pred_action_proba = self.action_model.predict(self.X_test, num_iteration=self.action_model.best_iteration)
        y_pred_action = np.argmax(y_pred_action_proba, axis=1)
        action_accuracy = accuracy_score(self.y_action_test, y_pred_action)
        action_f1 = f1_score(self.y_action_test, y_pred_action, average='weighted')
        
        # Plot confusion matrices
        self.plot_confusion_matrix(
            self.y_risk_test, y_pred_risk, 
            self.risk_encoder.classes_, 
            'Risk Classifier', 'risk_confusion_matrix.png'
        )
        
        self.plot_confusion_matrix(
            self.y_action_test, y_pred_action, 
            self.action_encoder.classes_, 
            'Action Recommender', 'action_confusion_matrix.png'
        )
        
        return {
            'arrival': {'mae': mae_test, 'rmse': rmse_test},
            'risk': {'accuracy': risk_accuracy, 'f1': risk_f1},
            'action': {'accuracy': action_accuracy, 'f1': action_f1}
        }
    
    def save_models(self):
        """Save all trained models"""
        print("\n💾 Saving models...")
        
        # Save models
        joblib.dump(self.arrival_model, os.path.join(self.output_dir, 'arrival_model.pkl'))
        joblib.dump(self.risk_model, os.path.join(self.output_dir, 'risk_model.pkl'))
        joblib.dump(self.action_model, os.path.join(self.output_dir, 'action_model.pkl'))
        
        # Save encoders
        joblib.dump(self.risk_encoder, os.path.join(self.output_dir, 'risk_encoder.pkl'))
        joblib.dump(self.action_encoder, os.path.join(self.output_dir, 'action_encoder.pkl'))
        
        print("   ✅ Models saved successfully!")
    
    def print_final_summary(self, test_metrics):
        """Print final training summary"""
        print("\n" + "="*60)
        print("🎉 TRAINING COMPLETED SUCCESSFULLY!")
        print("="*60)
        
        print(f"\n📈 FINAL RESULTS:")
        print(f"[Arrival Forecaster] Best iteration: {self.arrival_model.best_iteration} | MAE={test_metrics['arrival']['mae']:.1f} | RMSE={test_metrics['arrival']['rmse']:.1f}")
        print(f"[Risk Classifier] Accuracy={test_metrics['risk']['accuracy']:.2f} | F1={test_metrics['risk']['f1']:.2f} | Confusion matrix saved.")
        print(f"[Action Recommender] Accuracy={test_metrics['action']['accuracy']:.2f} | F1={test_metrics['action']['f1']:.2f} | Confusion matrix saved.")
        
        print(f"\n💾 MODELS SAVED:")
        print(f"   - arrival_model.pkl")
        print(f"   - risk_model.pkl") 
        print(f"   - action_model.pkl")
        print(f"   - risk_encoder.pkl")
        print(f"   - action_encoder.pkl")
        
        print(f"\n📊 VISUALIZATIONS SAVED:")
        print(f"   - risk_confusion_matrix.png")
        print(f"   - action_confusion_matrix.png")
        
        print(f"\n📁 All files saved to: {os.path.abspath(self.output_dir)}")
        print("="*60)
    
    def run_training(self):
        """Run the complete training pipeline"""
        print("🚀 Starting Crowd Simulation Training Pipeline")
        print("="*60)
        
        # Step 1: Load and preprocess data
        self.load_and_preprocess_data()
        
        # Step 2: Encode categorical features
        self.encode_categorical_features()
        
        # Step 3: Prepare features and targets
        X, y_arrival, y_risk, y_action = self.prepare_features_and_targets()
        
        # Step 4: Split data
        self.split_data(X, y_arrival, y_risk, y_action)
        
        # Step 5: Train models
        arrival_mae, arrival_rmse = self.train_arrival_forecaster()
        risk_acc, risk_f1, _ = self.train_risk_classifier()
        action_acc, action_f1, _ = self.train_action_recommender()
        
        # Step 6: Evaluate models
        test_metrics = self.evaluate_models()
        
        # Step 7: Save models
        self.save_models()
        
        # Step 8: Print final summary
        self.print_final_summary(test_metrics)


def main():
    """Main function to run the training"""
    # Dataset path
    data_path = r"D:\Jushita\Projects\Amazon\dataset\crowd_simulation_bukitjalil_450k_NEW.xlsx"
    
    # Output directory
    output_dir = "models"
    
    # Check if dataset exists
    if not os.path.exists(data_path):
        print(f"❌ Dataset not found at: {data_path}")
        print("Please check the file path and try again.")
        return
    
    # Initialize trainer
    trainer = CrowdSimulationTrainer(data_path, output_dir)
    
    # Run training
    trainer.run_training()


if __name__ == "__main__":
    main()

