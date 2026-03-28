import PCOSReport from "../models/PCOSReport.js";
import DoctorConnection from "../models/DoctorConnection.js";

/* GET /api/admin/reports */
export const getAllReports = async (req, res) => {
  try {
    const reports = await PCOSReport.find()
      .sort({ created_at: -1 })
      .populate("user_id", "name email")
      .lean();
    return res.status(200).json(reports);
  } catch (err) {
    console.error("[GET_ALL_REPORTS]", err.message);
    return res.status(500).json({ message: "Failed to fetch reports" });
  }
};

/* GET /api/admin/reports/:id */
export const getReportById = async (req, res) => {
  try {
    const report = await PCOSReport.findById(req.params.id)
      .populate("user_id", "name email")
      .lean();
    if (!report) return res.status(404).json({ message: "Report not found" });
    return res.status(200).json(report);
  } catch (err) {
    console.error("[GET_REPORT_BY_ID]", err.message);
    return res.status(500).json({ message: "Failed to fetch report" });
  }
};

/* DELETE /api/admin/reports/:id */
export const deleteReport = async (req, res) => {
  try {
    const report = await PCOSReport.findByIdAndDelete(req.params.id);
    if (!report) return res.status(404).json({ message: "Report not found" });
    // Remove doctor connections that referenced this report
    await DoctorConnection.deleteMany({ reportId: req.params.id });
    return res.status(200).json({ message: "Report deleted" });
  } catch (err) {
    console.error("[DELETE_REPORT]", err.message);
    return res.status(500).json({ message: "Failed to delete report" });
  }
};
