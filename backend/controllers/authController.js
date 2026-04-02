import User from "../models/User.js";
import OtpModel from "../models/Otp.js";
import Notification from "../models/Notification.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { sendOtpEmail, sendEmail, sendPasswordResetEmail } from "../services/mailService.js";
import { getSettings } from "../services/settingsService.js";

/* REGISTER */
export const register = async (req, res) => {
  try {
    const { name, email, password, age, contactNumber } = req.body;

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      age: age ? Number(age) : null,
      contactNumber: contactNumber || "",
    });

    // Send welcome email
    try {
      await sendEmail({
        to: email,
        subject: "Welcome to OvaCare 🌸",
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;border:1px solid #f0d0d8;border-radius:16px">
            <h2 style="color:#b05070">Welcome to OvaCare, ${name}! 🌸</h2>
            <p style="color:#555">Your account has been created successfully. We're so glad to have you!</p>
            <p style="color:#555">OvaCare helps you understand PCOS symptoms, track your cycle, and make informed health decisions.</p>
            <div style="margin:24px 0;padding:16px;background:#fdf0f4;border-radius:12px">
              <p style="color:#b05070;margin:0;font-weight:bold">What you can do next:</p>
              <ul style="color:#555;margin:8px 0 0">
                <li>Take your PCOS risk assessment</li>
                <li>Track your menstrual cycle</li>
                <li>Log daily symptoms &amp; moods</li>
                <li>Connect with a doctor</li>
              </ul>
            </div>
            <p style="color:#999;font-size:12px">This is an automated message. Please do not reply to this email.</p>
          </div>
        `,
      });
    } catch (mailErr) {
      console.error("Welcome email error:", mailErr);
    }

    res.status(201).json({
      message: "Registration successful",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Registration failed" });
  }
};

/* SEND OTP (email-only step, account created separately via /register) */
export const sendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !email.includes("@")) {
      return res.status(400).json({ message: "A valid email is required" });
    }

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: "User already exists with this email" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresMins = Number(process.env.OTP_EXPIRES_MINUTES) || 5;
    const expiresAt = new Date(Date.now() + expiresMins * 60 * 1000);

    await OtpModel.findOneAndUpdate(
      { email },
      { otp, expiresAt, fullName: null, password: null, age: null, contactNumber: null },
      { upsert: true, new: true }
    );

    await sendOtpEmail({ to: email, otp });

    res.json({ message: "OTP sent successfully" });
  } catch (err) {
    console.error("sendOtp error:", err.message);
    res.status(500).json({ message: `Failed to send OTP: ${err.message}` });
  }
};

/* VERIFY OTP (email-only step, account created separately via /register) */
export const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ message: "Email and OTP are required" });

    const record = await OtpModel.findOne({ email });
    if (!record) return res.status(400).json({ message: "OTP expired or not found. Please request a new one." });
    if (record.expiresAt < new Date()) {
      await OtpModel.deleteOne({ email });
      return res.status(400).json({ message: "OTP has expired. Please request a new one." });
    }
    if (record.otp !== otp.trim()) return res.status(400).json({ message: "Invalid OTP. Please try again." });

    await OtpModel.deleteOne({ email });

    res.json({ message: "OTP verified successfully" });
  } catch (err) {
    console.error("verifyOtp error:", err.message);
    res.status(500).json({ message: "OTP verification failed" });
  }
};

/* SEND REGISTER OTP (validates all fields, stores data, sends OTP) */
export const sendRegisterOtp = async (req, res) => {
  try {
    const { fullName, email, password, age, contactNumber } = req.body;

    // Field validation
    if (!fullName || !fullName.trim()) return res.status(400).json({ message: "Full name is required" });
    if (!email || !email.includes("@")) return res.status(400).json({ message: "A valid email address is required" });
    if (!password || password.length < 6) return res.status(400).json({ message: "Password must be at least 6 characters" });
    if (!age || isNaN(age) || Number(age) < 10 || Number(age) > 100) return res.status(400).json({ message: "Enter a valid age between 10 and 100" });
    if (!/^\d{10}$/.test(contactNumber)) return res.status(400).json({ message: "Contact number must be exactly 10 digits" });

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: "An account with this email already exists" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresMins = Number(process.env.OTP_EXPIRES_MINUTES) || 5;
    const expiresAt = new Date(Date.now() + expiresMins * 60 * 1000);

    // Upsert OTP record with all registration data (password stored plaintext – deleted on use)
    await OtpModel.findOneAndUpdate(
      { email },
      { otp, expiresAt, fullName: fullName.trim(), password, age: Number(age), contactNumber },
      { upsert: true, new: true }
    );

    await sendOtpEmail({ to: email, otp });

    res.json({ message: "OTP sent to your email. Please verify to complete registration." });
  } catch (err) {
    console.error("sendRegisterOtp error:", err.message);
    res.status(500).json({ message: `Failed to send OTP: ${err.message}` });
  }
};

/* VERIFY REGISTER OTP AND CREATE ACCOUNT */
export const verifyRegisterOtpAndCreateAccount = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ message: "Email and OTP are required" });

    const record = await OtpModel.findOne({ email });
    if (!record) return res.status(400).json({ message: "OTP expired or not found. Please request a new one." });

    if (record.expiresAt < new Date()) {
      await OtpModel.deleteOne({ email });
      return res.status(400).json({ message: "OTP has expired. Please request a new one." });
    }

    if (record.otp !== otp.trim()) return res.status(400).json({ message: "Invalid OTP. Please try again." });

    // Ensure registration data is present (this OTP was sent via sendRegisterOtp)
    if (!record.fullName || !record.password) {
      return res.status(400).json({ message: "Registration data not found. Please start over." });
    }

    const hashedPassword = await bcrypt.hash(record.password, 10);

    const user = await User.create({
      name: record.fullName,
      email,
      password: hashedPassword,
      age: record.age,
      contactNumber: record.contactNumber,
    });

    // Clean up OTP
    await OtpModel.deleteOne({ email });

    // New user alert notification (if setting enabled)
    try {
      const settings = await getSettings();
      if (settings.newUserAlert) {
        await Notification.create({
          title:   "New User Registered",
          message: `${user.name} (${user.email}) has created a new account.`,
          type:    "info",
          audience: "admin",
          sentBy:  "System",
        });
      }
    } catch (notifErr) {
      console.error("New user notification error:", notifErr.message);
    }

    // Send welcome email (non-blocking)
    sendEmail({
      to: email,
      subject: "Welcome to OvaCare 🌸",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;
                    border:1px solid #f0d0d8;border-radius:16px;background:#fffafb">
          <h2 style="color:#b05070;margin-top:0">Welcome to OvaCare, ${user.name}! 🌸</h2>
          <p style="color:#555">Your account has been created successfully. We're so glad to have you!</p>
          <div style="margin:20px 0;padding:16px;background:#fdf0f4;border-radius:12px">
            <p style="color:#b05070;margin:0 0 8px;font-weight:bold">What you can do next:</p>
            <ul style="color:#555;margin:0;padding-left:20px">
              <li>Take your PCOS risk assessment</li>
              <li>Track your menstrual cycle</li>
              <li>Log daily symptoms &amp; moods</li>
              <li>Connect with a doctor</li>
            </ul>
          </div>
          <p style="color:#999;font-size:12px;margin-bottom:0">This is an automated message. Please do not reply.</p>
        </div>`,
    }).catch((err) => console.error("Welcome email error:", err.message));

    res.status(201).json({
      message: "Account created successfully",
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (err) {
    console.error("verifyRegisterOtpAndCreateAccount error:", err.message);
    res.status(500).json({ message: "Account creation failed. Please try again." });
  }
};

/* LOGIN */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user)
      return res.status(404).json({ message: "User not found" });

    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        profilePicture: user.profilePicture || "",
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Login failed" });
  }
};

/* GET CURRENT USER PROFILE */
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      profilePicture: user.profilePicture || "",
      createdAt: user.createdAt,
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to get profile" });
  }
};

/* UPDATE PROFILE */
export const updateProfile = async (req, res) => {
  try {
    const { name, email } = req.body;
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if email is being changed and if it already exists
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: "Email already in use" });
      }
    }

    if (name) user.name = name;
    if (email) user.email = email;

    await user.save();

    res.json({
      message: "Profile updated successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        profilePicture: user.profilePicture || "",
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to update profile" });
  }
};

/* VERIFY TOKEN */
export const verifyToken = async (req, res) => {
  try {
    // This endpoint requires valid token (authMiddleware will reject invalid ones)
    // If we reached here, the token is valid
    const user = await User.findById(req.user.userId).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      profilePicture: user.profilePicture || "",
    });
  } catch (err) {
    res.status(500).json({ message: "Token verification failed" });
  }
};

/* CHANGE PASSWORD */
export const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ message: "Old and new passwords are required" });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const match = await bcrypt.compare(oldPassword, user.password);
    if (!match) {
      return res.status(401).json({ message: "Old password is incorrect" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ message: "Password changed successfully" });
  } catch (err) {
    res.status(500).json({ message: "Failed to change password" });
  }
};

/* UPLOAD PROFILE PICTURE */
export const uploadProfilePicture = async (req, res) => {
  try {
    const { profilePicture } = req.body;

    if (!profilePicture) {
      return res.status(400).json({ message: "Profile picture data is required" });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.profilePicture = profilePicture;
    await user.save();

    res.json({
      message: "Profile picture updated successfully",
      profilePicture: user.profilePicture,
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to upload profile picture" });
  }
};

/* FORGOT PASSWORD — sends a 6-digit OTP to the user's email */
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !email.includes("@")) {
      return res.status(400).json({ message: "A valid email address is required" });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      // Return the same message to avoid email enumeration
      return res.json({ message: "If that email is registered, an OTP has been sent." });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOtp = await bcrypt.hash(otp, 10);
    const expiresMins = Number(process.env.OTP_EXPIRES_MINUTES) || 5;
    const expiresAt = new Date(Date.now() + expiresMins * 60 * 1000);

    await OtpModel.findOneAndUpdate(
      { email: email.toLowerCase().trim(), purpose: "password_reset" },
      { otp: hashedOtp, expiresAt },
      { upsert: true, new: true }
    );

    await sendPasswordResetEmail({ to: email, otp });
    res.json({ message: "If that email is registered, an OTP has been sent." });
  } catch (err) {
    console.error("[FORGOT PASSWORD]", err.message);
    res.status(500).json({ message: "Failed to send OTP. Please try again." });
  }
};

/* RESET PASSWORD — verifies OTP, updates password */
export const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: "Email, OTP, and new password are required" });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters" });
    }

    const record = await OtpModel.findOne({
      email: email.toLowerCase().trim(),
      purpose: "password_reset",
    });
    if (!record) {
      return res.status(400).json({ message: "OTP expired or not found. Please request a new one." });
    }
    if (record.expiresAt < new Date()) {
      await OtpModel.deleteOne({ _id: record._id });
      return res.status(400).json({ message: "OTP has expired. Please request a new one." });
    }

    const otpMatch = await bcrypt.compare(otp.trim(), record.otp);
    if (!otpMatch) {
      return res.status(400).json({ message: "Invalid OTP. Please try again." });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) return res.status(404).json({ message: "User not found." });

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    await OtpModel.deleteOne({ _id: record._id });

    res.json({ message: "Password reset successful. You can now log in." });
  } catch (err) {
    console.error("[RESET PASSWORD]", err.message);
    res.status(500).json({ message: "Failed to reset password. Please try again." });
  }
};
