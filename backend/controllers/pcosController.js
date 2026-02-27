import PCOSReport from "../models/PCOSReport.js";
import axios from "axios";

/*
-----------------------------------------
   PCOS PREDICTION CONTROLLER
-----------------------------------------
*/
export const predictPCOS = async (req, res) => {
  try {
    // Extract only ML features to send to the Python service
    const { bmi, cycle_length, acne, hair_growth, weight_gain, form_data } = req.body;
    const mlFeatures = { bmi, cycle_length, acne, hair_growth, weight_gain };

    // Send only ML features to Python ML service
    const mlResponse = await axios.post(
      "http://127.0.0.1:5001/predict",
      mlFeatures
    );

    const result = mlResponse.data;

    // Save report to database using correct schema fields
    await PCOSReport.create({
      user_id: req.user.userId,
      form_data: form_data || mlFeatures,
      risk_level: result.risk || "Unknown",
      risk_message: result.message || `Confidence: ${result.confidence || "N/A"}`,
    });

    res.status(200).json(result);

  } catch (error) {
    console.error("PCOS prediction error:", error.message);

    res.status(500).json({
      message: "PCOS prediction failed",
      error: error.message,
    });
  }
};


/*
-----------------------------------------
   GET USER REPORTS CONTROLLER
-----------------------------------------
*/
export const getMyPCOSReports = async (req, res) => {
  try {
    const userId = req.user.userId;

    const reports = await PCOSReport.find({ user_id: userId }).sort({ created_at: -1 });

    res.status(200).json(reports);

  } catch (error) {
    console.error("Fetch reports error:", error.message);

    res.status(500).json({
      message: "Failed to fetch reports",
      error: error.message,
    });
  }
};