from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import pandas as pd
import json

app = Flask(__name__)
CORS(app)

# Load models
dt_model = joblib.load("pcos_decision_tree_model.joblib")
rf_model = joblib.load("pcos_random_forest_model.joblib")
feature_columns = joblib.load("pcos_feature_columns.joblib")

@app.route("/predict", methods=["POST"])
def predict():
    try:
        #  DEBUG: raw data
        raw_data = request.data
        print("RAW DATA:", raw_data)

        if not raw_data:
            return jsonify({"error": "Empty request body"}), 400

        #  FORCE JSON PARSE
        data = json.loads(raw_data.decode("utf-8"))
        print("PARSED JSON:", data)

        df = pd.DataFrame([data])

        # Ensure column order
        df = df.reindex(columns=feature_columns, fill_value=0)

        # Decision Tree
        dt_pred = dt_model.predict(df)[0]
        if dt_pred == 1:
            return jsonify({
                "pcos": True,
                "risk": "High",
                "message": "High risk of PCOS"
            })

        # Random Forest
        rf_pred = rf_model.predict(df)[0]
        rf_prob = rf_model.predict_proba(df)[0][1]

        if rf_pred == 1:
            return jsonify({
                "pcos": True,
                "risk": "Moderate",
                "confidence": round(float(rf_prob), 2)
            })

        return jsonify({
            "pcos": False,
            "risk": "Low",
            "message": "Low risk of PCOS"
        })

    except Exception as e:
        print("SERVER ERROR:", str(e))
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5002, debug=True)
