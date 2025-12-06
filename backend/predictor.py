import numpy as np
from sklearn.linear_model import LinearRegression
import logging

logger = logging.getLogger("MAITRI-PREDICT")

class DigitalTwin:
    def __init__(self):
        # Store tuples of (timestamp_offset, hr_value)
        self.history = []
        self.window_size = 60 * 30 # Keep 30 minutes of data (assuming 1 reading/sec)
        self.model = LinearRegression()

    def add_reading(self, hr):
        """Add a new heart rate reading to history"""
        # We use a simple counter as timestamp for this prototype
        t = len(self.history)
        self.history.append([t, hr])
        
        # Keep buffer fixed size
        if len(self.history) > self.window_size:
            self.history.pop(0)

    def predict_trend(self, minutes_ahead=15):
        """Predicts HR 'minutes_ahead' into the future"""
        if len(self.history) < 30: # Need at least 30 seconds of data
            return None

        # Prepare Data
        data = np.array(self.history)
        X = data[:, 0].reshape(-1, 1) # Time
        y = data[:, 1] # Heart Rate

        # Train Model (Instant on CPU for this size)
        self.model.fit(X, y)

        # Predict Future
        current_t = self.history[-1][0]
        future_t = current_t + (minutes_ahead * 60) # Convert mins to seconds
        
        predicted_hr = self.model.predict([[future_t]])[0]
        slope = self.model.coef_[0]

        return {
            "predicted_hr": int(predicted_hr),
            "slope": slope, # Positive = Rising, Negative = Falling
            "status": "RISING" if slope > 0.05 else "STABLE" if slope > -0.05 else "RECOVERING"
        }

predictor = DigitalTwin()
