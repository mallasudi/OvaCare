export const saveAuth = ({ token, user }) => {
  if (token) localStorage.setItem("token", token);
  if (user) localStorage.setItem("user", JSON.stringify(user));
};

export const getUser = () => {
  try {
    const user = localStorage.getItem("user");
    if (!user) return null;
    return JSON.parse(user);
  } catch {
    localStorage.removeItem("user");
    return null;
  }
};

export const isLoggedIn = () => {
  return !!localStorage.getItem("token");
};

export const logout = () => {
  // Clear only auth-related keys, preserve other settings like lang and theme
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  localStorage.removeItem("latestResult");
  localStorage.removeItem("profilePicture");
  localStorage.removeItem("authToken");
  sessionStorage.removeItem("pendingAssessment");
  sessionStorage.removeItem("authToken");
};
