import Doctor from "../models/Doctor.js";
import DoctorConnection from "../models/DoctorConnection.js";

/* POST /api/admin/doctors */
export const addDoctor = async (req, res) => {
  try {
    const { name, email, specialization, experience, hospital, location, image, description, phone } = req.body;
    if (!name || !email || !specialization)
      return res.status(400).json({ message: "name, email and specialization are required" });

    const exists = await Doctor.findOne({ email: email.toLowerCase().trim() }).lean();
    if (exists) return res.status(409).json({ message: "A doctor with this email already exists" });

    const doctor = await Doctor.create({ name, email, specialization, experience, hospital, location, image, description, phone });
    return res.status(201).json({ message: "Doctor added", doctor });
  } catch (err) {
    console.error("[ADD_DOCTOR]", err.message);
    return res.status(500).json({ message: "Failed to add doctor" });
  }
};

/* GET /api/admin/doctors */
export const getAllDoctorsForAdmin = async (req, res) => {
  try {
    const doctors = await Doctor.find().lean();
    const connectionCounts = await DoctorConnection.aggregate([
      { $group: { _id: "$doctorId", count: { $sum: 1 } } },
    ]);
    const countMap = Object.fromEntries(connectionCounts.map((c) => [c._id.toString(), c.count]));
    return res.status(200).json(doctors.map((d) => ({ ...d, totalConnections: countMap[d._id.toString()] ?? 0 })));
  } catch (err) {
    console.error("[GET_ALL_DOCTORS]", err.message);
    return res.status(500).json({ message: "Failed to fetch doctors" });
  }
};

/* GET /api/admin/doctors/:id */
export const getDoctorByIdForAdmin = async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id).lean();
    if (!doctor) return res.status(404).json({ message: "Doctor not found" });

    const [totalConnections, recentConnections] = await Promise.all([
      DoctorConnection.countDocuments({ doctorId: doctor._id }),
      DoctorConnection.find({ doctorId: doctor._id })
        .sort({ connectedAt: -1 }).limit(10)
        .populate("userId",   "name email")
        .populate("reportId", "risk_level created_at")
        .lean(),
    ]);
    return res.status(200).json({ ...doctor, totalConnections, recentConnections });
  } catch (err) {
    console.error("[GET_DOCTOR_BY_ID]", err.message);
    return res.status(500).json({ message: "Failed to fetch doctor" });
  }
};

/* PUT /api/admin/doctors/:id */
export const updateDoctor = async (req, res) => {
  try {
    const { _id, __v, ...updates } = req.body;
    if (updates.email) {
      updates.email = updates.email.toLowerCase().trim();
      const conflict = await Doctor.findOne({ email: updates.email, _id: { $ne: req.params.id } }).lean();
      if (conflict) return res.status(409).json({ message: "Email already in use by another doctor" });
    }
    const doctor = await Doctor.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!doctor) return res.status(404).json({ message: "Doctor not found" });
    return res.status(200).json({ message: "Doctor updated", doctor });
  } catch (err) {
    console.error("[UPDATE_DOCTOR]", err.message);
    return res.status(500).json({ message: "Failed to update doctor" });
  }
};

/* PATCH /api/admin/doctors/:id/status */
export const toggleDoctorStatus = async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) return res.status(404).json({ message: "Doctor not found" });
    doctor.isActive = !doctor.isActive;
    await doctor.save();
    return res.status(200).json({ message: `Doctor ${doctor.isActive ? "activated" : "deactivated"}`, isActive: doctor.isActive });
  } catch (err) {
    console.error("[TOGGLE_DOCTOR]", err.message);
    return res.status(500).json({ message: "Failed to toggle doctor status" });
  }
};

/* GET /api/admin/doctor-analytics */
export const getDoctorAnalytics = async (req, res) => {
  try {
    const [allDoctors, specializationStats, connectionStats] = await Promise.all([
      Doctor.find().lean(),
      Doctor.aggregate([
        { $group: { _id: "$specialization", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $project: { _id: 0, specialization: "$_id", count: 1 } },
      ]),
      DoctorConnection.aggregate([
        { $group: { _id: "$doctorId", userCount: { $sum: 1 } } },
        { $lookup: { from: "doctors", localField: "_id", foreignField: "_id", as: "doctor" } },
        { $unwind: { path: "$doctor", preserveNullAndEmpty: true } },
        { $project: { _id: 0, doctorId: "$_id", doctorName: "$doctor.name", userCount: 1 } },
        { $sort: { userCount: -1 } },
      ]),
    ]);

    return res.status(200).json({
      totalDoctors:        allDoctors.length,
      activeDoctors:       allDoctors.filter((d) => d.isActive).length,
      inactiveDoctors:     allDoctors.filter((d) => !d.isActive).length,
      specializationStats,
      doctorConnections:   connectionStats,
      mostPopularDoctor:   connectionStats[0]                         ?? null,
      leastPopularDoctor:  connectionStats[connectionStats.length - 1] ?? null,
    });
  } catch (err) {
    console.error("[DOCTOR_ANALYTICS]", err.message);
    return res.status(500).json({ message: "Failed to fetch doctor analytics" });
  }
};
