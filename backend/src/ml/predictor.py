"""
AssureX Claim Engine — Tabular ML Inference Service

Loads the serialized best model artifact and provides clean, fast prediction
and probability estimation for live warranty claim evaluations.
"""

import os
import joblib
import pandas as pd
from typing import Dict, Any, Tuple

from .preprocessing import clean_dataframe, INT_TO_LABEL

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DEFAULT_MODEL_PATH = os.path.join(BASE_DIR, "model", "best_model.joblib")


class TabularPredictor:
    """Production inference wrapper for the best trained tabular model."""

    def __init__(self, model_path: str = DEFAULT_MODEL_PATH):
        self.model_path = model_path
        self.model_artifact = None
        self.model = None
        self.preprocessor = None
        self.model_name = "Unloaded"
        self._load_model()

    def _load_model(self):
        """Load serialized model artifact from disk."""
        if not os.path.exists(self.model_path):
            print(f"[TabularPredictor] Warning: Model file not found at {self.model_path}")
            return

        self.model_artifact = joblib.load(self.model_path)
        self.model = self.model_artifact["model"]
        self.preprocessor = self.model_artifact["preprocessor"]
        self.model_name = self.model_artifact.get("model_name", "BestModel")
        print(f"[TabularPredictor] Successfully loaded {self.model_name} from {self.model_path}")

    @property
    def is_ready(self) -> bool:
        """Check if model is loaded and ready for inference."""
        return self.model is not None and self.preprocessor is not None

    def predict(self, claim_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Predict outcome and class probabilities for a single claim dictionary.
        Returns:
            {
                "model_type": "Python_Tabular",
                "model_name": str,
                "predicted_class": "Likely Valid" | "Likely Invalid" | "Manual Review Required",
                "confidence_scores": {
                    "Likely Valid": float,
                    "Likely Invalid": float,
                    "Manual Review Required": float
                },
                "top_confidence": float
            }
        """
        if not self.is_ready:
            # Fallback if model not trained yet
            return {
                "model_type": "Python_Tabular",
                "model_name": "Fallback_Rule_Estimator",
                "predicted_class": "Manual Review Required",
                "confidence_scores": {
                    "Likely Valid": 0.33,
                    "Likely Invalid": 0.33,
                    "Manual Review Required": 0.34,
                },
                "top_confidence": 0.34,
            }

        df = pd.DataFrame([claim_data])
        df_clean = clean_dataframe(df)
        X = self.preprocessor.transform(df_clean)

        # Get class probabilities
        if hasattr(self.model, "predict_proba"):
            probs = self.model.predict_proba(X)[0]
        elif hasattr(self.model, "decision_function"):
            import scipy.special
            df_vals = self.model.decision_function(X)[0]
            probs = scipy.special.softmax(df_vals)
        else:
            pred_idx = self.model.predict(X)[0]
            probs = [0.0, 0.0, 0.0]
            probs[pred_idx] = 1.0

        class_names = [INT_TO_LABEL[i] for i in range(len(probs))]
        confidence_dict = {
            class_names[i]: round(float(probs[i]), 4) for i in range(len(probs))
        }

        top_class_idx = int(probs.argmax())
        top_class = INT_TO_LABEL[top_class_idx]
        top_conf = round(float(probs[top_class_idx]), 4)

        return {
            "model_type": "Python_Tabular",
            "model_name": self.model_name,
            "predicted_class": top_class,
            "confidence_scores": confidence_dict,
            "top_confidence": top_conf,
        }
