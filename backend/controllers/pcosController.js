import PCOSReport from "../models/PCOSReport.js";
import axios from "axios";

const ML_SERVICE_URL = "http://127.0.0.1:5001/predict";

/*
-----------------------------------------
   PUBLIC PCOS PREDICTION (No Auth, No DB Save)
-----------------------------------------
*/
export const predictPCOSPublic = async (req, res) => {
  try {
    const { bmi, cycle_length, acne, hair_growth, weight_gain } = req.body;

    if (!bmi || !cycle_length) {
      console.error("[PUBLIC PREDICT] Missing required ML features");
      return res.status(400).json({
        message: "Missing required fields: bmi, cycle_length",
      });
    }

    const mlFeatures = { bmi, cycle_length, acne, hair_growth, weight_gain };

    console.log("[PUBLIC PREDICT] Sending to ML service at", ML_SERVICE_URL);

    const mlResponse = await axios.post(ML_SERVICE_URL, mlFeatures, { timeout: 30000 });

    console.log("[PUBLIC PREDICT] ML service response:", mlResponse.data);

    res.status(200).json(mlResponse.data);
  } catch (error) {
    console.error("[PUBLIC PREDICT] ML service error:", {
      message: error.message,
      status: error.response?.status,
      code: error.code,
      data: error.response?.data,
    });

    // Provide more helpful error messages
    if (error.code === "ECONNREFUSED") {
      return res.status(503).json({
        message: "ML service is temporarily unavailable. Please try again later.",
        error: "Connection refused",
      });
    }

    res.status(error.response?.status || 500).json({
      message: "PCOS prediction failed",
      error: error.message,
      mlServiceError: error.response?.data,
    });
  }
};

/*
-----------------------------------------
   AUTHENTICATED PCOS PREDICTION (With Auth, DB Save)
-----------------------------------------
*/
export const predictPCOS = async (req, res) => {
  try {
    const { ml_features, form_data } = req.body;

    if (!ml_features || !ml_features.bmi || !ml_features.cycle_length) {
      console.error("[AUTH PREDICT] Missing required ML features");
      return res.status(400).json({
        message: "Missing required fields in ml_features: bmi, cycle_length",
      });
    }

    console.log("[AUTH PREDICT] User ID:", req.user.userId);
    console.log("[AUTH PREDICT] ML features:", ml_features);
    console.log("[AUTH PREDICT] Sending to ML service at", ML_SERVICE_URL);

    const mlResponse = await axios.post(ML_SERVICE_URL, ml_features, { timeout: 30000 });

    console.log("[AUTH PREDICT] ML service response:", mlResponse.data);

    const result = mlResponse.data;

    // Save report to database
    const report = await PCOSReport.create({
      user_id: req.user.userId,
      form_data: form_data || ml_features,
      risk_level: result.risk || "Unknown",
      risk_message: result.message || `Confidence: ${result.confidence || "N/A"}`,
    });

    console.log("[AUTH PREDICT] Report saved:", report._id);

    // Include reportId in response so frontend can link directly to this report
    res.status(200).json({ ...result, reportId: report._id.toString() });
  } catch (error) {
    console.error("[AUTH PREDICT] Error:", {
      message: error.message,
      code: error.code,
      mlServiceError: error.response?.data,
      status: error.response?.status,
    });

    // Provide more helpful error messages
    if (error.code === "ECONNREFUSED") {
      return res.status(503).json({
        message: "ML service is temporarily unavailable. Please try again later.",
        error: "Connection refused",
      });
    }

    res.status(error.response?.status || 500).json({
      message: "PCOS prediction failed",
      error: error.message,
      mlServiceError: error.response?.data,
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

    console.log("[GET REPORTS] Fetching reports for user:", userId);

    const reports = await PCOSReport.find({ user_id: userId })
      .populate("user_id", "name email profilePicture")
      .sort({ created_at: -1 });

    console.log("[GET REPORTS] Found", reports.length, "reports");

    res.status(200).json(reports);
  } catch (error) {
    console.error("[GET REPORTS] Error:", error.message);

    res.status(500).json({
      message: "Failed to fetch reports",
      error: error.message,
    });
  }
};

/*
-----------------------------------------
   GET LATEST REPORT (for Dashboard)
-----------------------------------------
*/
export const getLatestReport = async (req, res) => {
  try {
    const userId = req.user.userId;

    console.log("[LATEST REPORT] Fetching latest report for user:", userId);

    const report = await PCOSReport.findOne({ user_id: userId })
      .populate("user_id", "name email profilePicture")
      .sort({ created_at: -1 });

    if (!report) {
      console.log("[LATEST REPORT] No reports found for user:", userId);
      return res.status(200).json(null);
    }

    console.log("[LATEST REPORT] Found report:", report._id, "risk:", report.risk_level);
    res.status(200).json(report);
  } catch (error) {
    console.error("[LATEST REPORT] Error:", error.message);
    res.status(500).json({
      message: "Failed to fetch latest report",
      error: error.message,
    });
  }
};

/*
-----------------------------------------
   GET SINGLE REPORT CONTROLLER
-----------------------------------------
*/
export const getReport = async (req, res) => {
  try {
    const { reportId } = req.params;
    const userId = req.user.userId;

    console.log("[GET REPORT] Fetching report:", reportId, "for user:", userId);

    const report = await PCOSReport.findOne({ _id: reportId, user_id: userId })
      .populate("user_id", "name email profilePicture");

    if (!report) {
      console.error("[GET REPORT] Report not found or unauthorized");
      return res.status(404).json({ message: "Report not found" });
    }

    res.status(200).json(report);
  } catch (error) {
    console.error("[GET REPORT] Error:", error.message);

    res.status(500).json({
      message: "Failed to fetch report",
      error: error.message,
    });
  }
};