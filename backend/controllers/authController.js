import User from "../models/User.js";
import OtpModel from "../models/Otp.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendEmail({ to, subject, html }) {
  const { error } = await resend.emails.send({
    from: "OvaCare <onboarding@resend.dev>",
    to,
    subject,
    html,
  });
  if (error) throw new Error(error.message);
}

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

/* SEND OTP */
export const sendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: "User already exists with this email" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Remove any previous OTP for this email
    await OtpModel.deleteMany({ email });
    await OtpModel.create({ email, otp });

    await sendEmail({
      to: email,
      subject: "Your OvaCare Verification Code",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;border:1px solid #f0d0d8;border-radius:16px">
          <h2 style="color:#b05070">OvaCare 🌸 Email Verification</h2>
          <p style="color:#555">Use the code below to verify your email address. It expires in <strong>10 minutes</strong>.</p>
          <div style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#b05070;text-align:center;padding:24px 0">${otp}</div>
          <p style="color:#999;font-size:12px">If you did not request this, please ignore this email.</p>
        </div>
      `,
    });

    res.json({ message: "OTP sent successfully" });
  } catch (err) {
    console.error("sendOtp error:", err);
    res.status(500).json({ message: "Failed to send OTP. Please try again." });
  }
};

/* VERIFY OTP */
export const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ message: "Email and OTP are required" });

    const record = await OtpModel.findOne({ email });
    if (!record) return res.status(400).json({ message: "OTP expired or not found. Please request a new one." });
    if (record.otp !== otp.trim()) return res.status(400).json({ message: "Invalid OTP. Please try again." });

    await OtpModel.deleteMany({ email });

    // Send verification success email
    try {
      await sendEmail({
        to: email,
        subject: "Email Verified Successfully – OvaCare 🌸",
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;border:1px solid #f0d0d8;border-radius:16px">
            <h2 style="color:#b05070">OvaCare 🌸</h2>
            <h3 style="color:#333">Your email has been verified!</h3>
            <p style="color:#555">You're all set. Your OvaCare account is being created now.</p>
            <p style="color:#999;font-size:12px">If you did not request this, please contact us immediately.</p>
          </div>
        `,
      });
    } catch (mailErr) {
      console.error("verifyOtp confirmation email error:", mailErr);
    }

    res.json({ message: "OTP verified successfully" });
  } catch (err) {
    res.status(500).json({ message: "OTP verification failed" });
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
