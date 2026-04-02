import dotenv from "dotenv";
dotenv.config(); // 🔥 THIS IS THE REAL FIX

import nodemailer from "nodemailer";
import { getSettings } from "./settingsService.js";

// Debug
console.log("MAIL SERVICE ENV CHECK:");
console.log("EMAIL_USER:", process.env.EMAIL_USER);
console.log("EMAIL_PASS:", process.env.EMAIL_PASS ? "LOADED" : "MISSING");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Verify transporter config on startup (non-blocking)
transporter.verify((error) => {
  if (error) {
    console.error("[Mail] Transporter config error:", error.message);
  } else {
    console.log("[Mail] Transporter is ready – Gmail SMTP connected.");
  }
});

/**
 * Send OTP verification email.
 * @param {{ to: string, otp: string }} param0
 */
export async function sendOtpEmail({ to, otp }) {
  const expiresMins = process.env.OTP_EXPIRES_MINUTES || 5;

  const mailOptions = {
    from: `"OvaCare 🌸" <${process.env.EMAIL_USER}>`,
    to,
    subject: "Your OvaCare Verification Code",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;
                  border:1px solid #f0d0d8;border-radius:16px;background:#fffafb">
        <h2 style="color:#b05070;margin-top:0">OvaCare 🌸 Email Verification</h2>
        <p style="color:#555">Use the code below to verify your email address.
           It expires in <strong>${expiresMins} minutes</strong>.</p>
        <div style="font-size:38px;font-weight:bold;letter-spacing:10px;color:#b05070;
                    text-align:center;padding:24px 0;background:#fdf0f4;
                    border-radius:12px;margin:20px 0">${otp}</div>
        <p style="color:#999;font-size:12px;margin-bottom:0">
          If you did not request this code, please ignore this email.
        </p>
      </div>`,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (err) {
    console.error("[Mail] sendOtpEmail failed:", err.message);
    throw err;
  }
}

/**
 * Send a consultation request email from a user to a doctor.
 * The email is sent FROM the OvaCare Gmail account, with Reply-To set to the user's email.
 * @param {{ doctorEmail: string, doctorName: string, userName: string, userEmail: string, subject: string, body: string }} param0
 */
export async function sendConsultationEmail({ doctorEmail, doctorName, userName, userEmail, subject, body, attachment }) {
  const settings = await getSettings();
  if (!settings.emailNotifications) {
    console.log("[Mail] sendConsultationEmail skipped — emailNotifications is disabled");
    return;
  }
  const mailOptions = {
    from: `"OvaCare 🌸" <${process.env.EMAIL_USER}>`,
    to: doctorEmail,
    replyTo: userEmail,
    subject,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:auto;padding:32px;
                  border:1px solid #f0d0d8;border-radius:16px;background:#fffafb">
        <h2 style="color:#b05070;margin-top:0">OvaCare 🌸 – Consultation Request</h2>
        <p style="color:#555">
          <strong>${userName}</strong> (<a href="mailto:${userEmail}" style="color:#b05070">${userEmail}</a>)
          has requested a consultation with you through OvaCare.
        </p>
        <div style="background:#fdf0f4;border-radius:12px;padding:20px 24px;margin:20px 0;
                    white-space:pre-wrap;font-size:14px;color:#333;line-height:1.7">
${body}
        </div>
        <p style="color:#999;font-size:12px;margin-bottom:0">
          This message was sent via OvaCare. Reply to this email to respond directly to the patient.
        </p>
      </div>`,
    attachments: attachment
      ? [{ filename: attachment.filename, content: attachment.buffer, contentType: attachment.mimetype }]
      : [],
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (err) {
    console.error("[Mail] sendConsultationEmail failed:", err.message);
    throw err;
  }
}

/**
 * Generic HTML email sender (welcome, confirmations, etc.)
 * @param {{ to: string, subject: string, html: string }} param0
 */
export async function sendEmail({ to, subject, html }) {
  const settings = await getSettings();
  if (!settings.emailNotifications) {
    console.log("[Mail] sendEmail skipped — emailNotifications is disabled");
    return;
  }
  try {
    await transporter.sendMail({
      from: `"OvaCare 🌸" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });
  } catch (err) {
    console.error("[Mail] sendEmail failed:", err.message);
    throw err;
  }
}

/**
 * Send password reset OTP email.
 * @param {{ to: string, otp: string }} param0
 */
export async function sendPasswordResetEmail({ to, otp }) {
  const expiresMins = process.env.OTP_EXPIRES_MINUTES || 5;
  const mailOptions = {
    from: `"OvaCare 🌸" <${process.env.EMAIL_USER}>`,
    to,
    subject: "OvaCare Password Reset OTP",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;
                  border:1px solid #f0d0d8;border-radius:16px;background:#fffafb">
        <h2 style="color:#b05070;margin-top:0">OvaCare 🌸 Password Reset</h2>
        <p style="color:#555">We received a request to reset your OvaCare password.
           Use the code below. It expires in <strong>${expiresMins} minutes</strong>.</p>
        <div style="font-size:38px;font-weight:bold;letter-spacing:10px;color:#b05070;
                    text-align:center;padding:24px 0;background:#fdf0f4;
                    border-radius:12px;margin:20px 0">${otp}</div>
        <p style="color:#555;font-size:13px">If you did not request a password reset, you can safely ignore this email. Your password will not change.</p>
        <p style="color:#999;font-size:12px;margin-bottom:0">— The OvaCare Team</p>
      </div>`,
  };
  try {
    await transporter.sendMail(mailOptions);
  } catch (err) {
    console.error("[Mail] sendPasswordResetEmail failed:", err.message);
    throw err;
  }
}
