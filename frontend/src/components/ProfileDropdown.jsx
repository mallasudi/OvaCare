import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import API from "../utils/api";

export default function ProfileDropdown({ user }) {
  const [isOpen, setIsOpen] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showUploadPicture, setShowUploadPicture] = useState(false);
  const [showThemeCustomization, setShowThemeCustomization] = useState(false);

  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const { logout, login } = useAuth();
  const { theme, setTheme } = useTheme();

  // Profile edit state
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [profileError, setProfileError] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);

  // Password change state
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Profile picture state
  const [picturePreview, setPicturePreview] = useState(user?.profilePicture || "");
  const [pictureLoading, setPictureLoading] = useState(false);
  const [pictureError, setPictureError] = useState("");

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setProfileError("");
    setProfileLoading(true);
    try {
      const res = await API.put("/auth/profile", { name, email });
      login(res.data.user);
      setShowEditProfile(false);
      setIsOpen(false);
    } catch (err) {
      setProfileError(err.response?.data?.message || "Failed to update profile");
    } finally {
      setProfileLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordLoading(true);
    try {
      await API.post("/auth/change-password", { oldPassword, newPassword });
      setOldPassword("");
      setNewPassword("");
      setShowChangePassword(false);
      setIsOpen(false);
      alert("Password changed successfully!");
    } catch (err) {
      setPasswordError(err.response?.data?.message || "Failed to change password");
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setPictureError("Image size must be less than 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setPicturePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleUploadPicture = async () => {
    if (!picturePreview) return;
    setPictureError("");
    setPictureLoading(true);
    try {
      const res = await API.post("/auth/upload-profile-picture", { profilePicture: picturePreview });
      login({ ...user, profilePicture: res.data.profilePicture });
      setShowUploadPicture(false);
      setIsOpen(false);
    } catch (err) {
      setPictureError(err.response?.data?.message || "Failed to upload picture");
    } finally {
      setPictureLoading(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Profile Avatar Button */}
      <motion.div
        whileHover={{ scale: 1.1 }}
        onClick={() => setIsOpen(!isOpen)}
        className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold shadow-lg cursor-pointer overflow-hidden"
        style={{
          background: user?.profilePicture
            ? "transparent"
            : "linear-gradient(135deg, var(--primary), var(--accent))",
          boxShadow: "0 4px 16px color-mix(in srgb, var(--primary) 40%, transparent)",
        }}
      >
        {user?.profilePicture ? (
          <img src={user.profilePicture} alt="Profile" className="w-full h-full object-cover" />
        ) : (
          user?.name?.[0]?.toUpperCase() || "U"
        )}
      </motion.div>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-64 rounded-2xl shadow-2xl overflow-hidden z-50"
            style={{
              background: "var(--card-bg)",
              border: "1px solid var(--border-color)",
            }}
          >
            {/* User Info Header */}
            <div className="p-4 border-b" style={{ borderColor: "var(--border-color)" }}>
              <p className="font-bold text-sm" style={{ color: "var(--text-main)" }}>
                {user?.name}
              </p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                {user?.email}
              </p>
            </div>

            {/* Menu Items */}
            <div className="py-2">
              <MenuItem
                icon="✏️"
                label="Edit Profile"
                onClick={() => {
                  setShowEditProfile(true);
                  setIsOpen(false);
                }}
              />
              <MenuItem
                icon="📸"
                label="Upload Picture"
                onClick={() => {
                  setShowUploadPicture(true);
                  setIsOpen(false);
                }}
              />
              <MenuItem
                icon="🔒"
                label="Change Password"
                onClick={() => {
                  setShowChangePassword(true);
                  setIsOpen(false);
                }}
              />
              <MenuItem
                icon="🎨"
                label="Theme"
                onClick={() => {
                  setShowThemeCustomization(true);
                  setIsOpen(false);
                }}
              />
              <div className="border-t my-1" style={{ borderColor: "var(--border-color)" }} />
              <MenuItem
                icon="🚪"
                label="Logout"
                onClick={handleLogout}
                danger
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Profile Modal */}
      <AnimatePresence>
        {showEditProfile && (
          <Modal onClose={() => setShowEditProfile(false)} title="Edit Profile">
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              {profileError && (
                <div
                  className="p-3 rounded-xl text-sm"
                  style={{
                    background: "rgba(220,38,38,0.08)",
                    border: "1px solid rgba(220,38,38,0.2)",
                    color: "#dc2626",
                  }}
                >
                  ⚠️ {profileError}
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-muted)" }}>
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none transition"
                  style={{
                    background: "var(--bg-main)",
                    border: "1px solid var(--border-color)",
                    color: "var(--text-main)",
                  }}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-muted)" }}>
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none transition"
                  style={{
                    background: "var(--bg-main)",
                    border: "1px solid var(--border-color)",
                    color: "var(--text-main)",
                  }}
                  required
                />
              </div>
              <button
                type="submit"
                disabled={profileLoading}
                className="w-full py-3 rounded-xl text-white font-bold shadow-lg transition"
                style={{
                  background: profileLoading
                    ? "var(--text-muted)"
                    : "linear-gradient(135deg, var(--primary), var(--accent))",
                }}
              >
                {profileLoading ? "Updating..." : "Update Profile"}
              </button>
            </form>
          </Modal>
        )}
      </AnimatePresence>

      {/* Change Password Modal */}
      <AnimatePresence>
        {showChangePassword && (
          <Modal onClose={() => setShowChangePassword(false)} title="Change Password">
            <form onSubmit={handleChangePassword} className="space-y-4">
              {passwordError && (
                <div
                  className="p-3 rounded-xl text-sm"
                  style={{
                    background: "rgba(220,38,38,0.08)",
                    border: "1px solid rgba(220,38,38,0.2)",
                    color: "#dc2626",
                  }}
                >
                  ⚠️ {passwordError}
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-muted)" }}>
                  Old Password
                </label>
                <input
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none transition"
                  style={{
                    background: "var(--bg-main)",
                    border: "1px solid var(--border-color)",
                    color: "var(--text-main)",
                  }}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-muted)" }}>
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none transition"
                  style={{
                    background: "var(--bg-main)",
                    border: "1px solid var(--border-color)",
                    color: "var(--text-main)",
                  }}
                  required
                  minLength={6}
                />
              </div>
              <button
                type="submit"
                disabled={passwordLoading}
                className="w-full py-3 rounded-xl text-white font-bold shadow-lg transition"
                style={{
                  background: passwordLoading
                    ? "var(--text-muted)"
                    : "linear-gradient(135deg, var(--primary), var(--accent))",
                }}
              >
                {passwordLoading ? "Changing..." : "Change Password"}
              </button>
            </form>
          </Modal>
        )}
      </AnimatePresence>

      {/* Upload Picture Modal */}
      <AnimatePresence>
        {showUploadPicture && (
          <Modal onClose={() => setShowUploadPicture(false)} title="Upload Profile Picture">
            <div className="space-y-4">
              {pictureError && (
                <div
                  className="p-3 rounded-xl text-sm"
                  style={{
                    background: "rgba(220,38,38,0.08)",
                    border: "1px solid rgba(220,38,38,0.2)",
                    color: "#dc2626",
                  }}
                >
                  ⚠️ {pictureError}
                </div>
              )}
              
              {/* Preview */}
              <div className="flex justify-center">
                <div
                  className="w-32 h-32 rounded-full flex items-center justify-center overflow-hidden"
                  style={{
                    background: picturePreview
                      ? "transparent"
                      : "linear-gradient(135deg, var(--primary), var(--accent))",
                    border: "2px solid var(--border-color)",
                  }}
                >
                  {picturePreview ? (
                    <img src={picturePreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-white text-4xl font-bold">
                      {user?.name?.[0]?.toUpperCase() || "U"}
                    </span>
                  )}
                </div>
              </div>

              {/* File Input */}
              <div>
                <label
                  className="block w-full py-3 rounded-xl text-center font-bold cursor-pointer transition"
                  style={{
                    background: "var(--bg-main)",
                    border: "2px dashed var(--border-color)",
                    color: "var(--text-main)",
                  }}
                >
                  Choose Image
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
                <p className="text-xs text-center mt-2" style={{ color: "var(--text-muted)" }}>
                  Max size: 5MB
                </p>
              </div>

              {/* Upload Button */}
              <button
                onClick={handleUploadPicture}
                disabled={!picturePreview || pictureLoading}
                className="w-full py-3 rounded-xl text-white font-bold shadow-lg transition disabled:opacity-50"
                style={{
                  background:
                    !picturePreview || pictureLoading
                      ? "var(--text-muted)"
                      : "linear-gradient(135deg, var(--primary), var(--accent))",
                }}
              >
                {pictureLoading ? "Uploading..." : "Upload Picture"}
              </button>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* Theme Customization Modal */}
      <AnimatePresence>
        {showThemeCustomization && (
          <Modal onClose={() => setShowThemeCustomization(false)} title="Theme Customization">
            <div className="space-y-3">
              {["normal", "light", "dark"].map((themeOption) => (
                <button
                  key={themeOption}
                  onClick={() => {
                    setTheme(themeOption);
                    setShowThemeCustomization(false);
                  }}
                  className="w-full py-3 px-4 rounded-xl text-left font-semibold transition flex items-center justify-between"
                  style={{
                    background: theme === themeOption ? "var(--primary)" : "var(--bg-main)",
                    color: theme === themeOption ? "white" : "var(--text-main)",
                    border: `2px solid ${theme === themeOption ? "var(--primary)" : "var(--border-color)"}`,
                  }}
                >
                  <span className="capitalize">
                    {themeOption === "normal" ? "🌸 Normal" : themeOption === "light" ? "☀️ Light" : "🌙 Dark"}
                  </span>
                  {theme === themeOption && <span>✓</span>}
                </button>
              ))}
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}

function MenuItem({ icon, label, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      className="w-full px-4 py-2.5 text-left text-sm font-medium hover:bg-opacity-10 transition flex items-center gap-2"
      style={{
        color: danger ? "#dc2626" : "var(--text-main)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = danger
          ? "rgba(220,38,38,0.08)"
          : "color-mix(in srgb, var(--primary) 10%, transparent)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
      }}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function Modal({ children, onClose, title }) {
  // Lock body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)", zIndex: 9999 }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, y: 24, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.92, y: 24, opacity: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 28 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
        style={{
          background: "var(--card-bg)",
          border: "1px solid var(--border-color)",
        }}
      >
        {/* Modal Header */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: "1px solid var(--border-color)" }}
        >
          <h3 className="text-lg font-bold" style={{ color: "var(--text-main)" }}>
            {title}
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition hover:scale-110"
            style={{
              background: "color-mix(in srgb, var(--primary) 12%, transparent)",
              color: "var(--primary)",
            }}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="px-6 py-5">
          {children}
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
}
