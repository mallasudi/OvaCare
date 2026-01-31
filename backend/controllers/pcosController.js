import axios from "axios";

export const predictPCOS = async (req, res) => {
  try {
    // Forward data to Flask ML service
    const mlResponse = await axios.post(
      "http://127.0.0.1:5001/predict",
      req.body
    );

    res.status(200).json(mlResponse.data);
  } catch (error) {
    console.error("PCOS prediction error:", error.message);
    res.status(500).json({
      message: "PCOS prediction failed",
      error: error.message,
    });
  }
};
