import { useState } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import Introduction from "./components/Introduction";
import GetStarted from "./components/GetStarted";
import DashboardPage from "./dashboard/DashboardPage";
import GoogleSignInButton, { setGoogleCredentialHandler } from "./components/GoogleSignInButton";
import { ProtectedRoute, PublicOnlyRoute } from "./components/ProtectedRoute";
import { useAuth } from "./hooks/useAuth";
import { signup as signupRequest } from "./services/authService";

import "./App.css";

function App() {
  const { login, loginWithGoogle, logout } = useAuth();
  const [googleError, setGoogleError] = useState("");
  const [dashboardNotice, setDashboardNotice] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  const handleEmailLogin = async (credentials) => {
    await login(credentials);
    setDashboardNotice("Login successful. Welcome back.");
    navigate("/dashboard", { replace: true });
  };

  const handleSignup = async (details) => {
    const result = await signupRequest(details);
    navigate("/login", { replace: true, state: { authNotice: result.message || "Account created. Please sign in." } });
    return result;
  };

  const handleGoogleCredential = async (credential) => {
    setGoogleError("");
    try {
      await loginWithGoogle(credential);
      setDashboardNotice("Google sign-in successful.");
      navigate("/dashboard", { replace: true });
    } catch (error) {
      console.error("Application Google authentication failed:", error);
      setGoogleError(error.message || "Google authentication failed. Please try again.");
    }
  };
  setGoogleCredentialHandler(handleGoogleCredential);

  const handleLogout = async () => {
    await logout();
    setDashboardNotice("");
    navigate("/", { replace: true });
  };

  const landingPage = (authMode = null) => (
    <PublicOnlyRoute>
      <LandingPage
        authMode={authMode}
        notice={location.state?.authNotice || ""}
        googleError={googleError}
        onCloseAuth={() => { setGoogleError(""); navigate("/", { replace: true, state: null }); }}
        onOpenLogin={() => { setGoogleError(""); navigate("/login"); }}
        onOpenSignup={() => { setGoogleError(""); navigate("/signup"); }}
        onSignup={handleSignup}
        onLogin={handleEmailLogin}
      />
    </PublicOnlyRoute>
  );

  return (
    <div className="app">
      <Routes>
        <Route path="/" element={landingPage()} />
        <Route path="/login" element={landingPage("login")} />
        <Route path="/signup" element={landingPage("signup")} />
        <Route path="/dashboard/*" element={<ProtectedRoute><DashboardPage onLogout={handleLogout} authNotice={dashboardNotice} /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

function LandingPage({ authMode, notice, googleError, onCloseAuth, onOpenLogin, onOpenSignup, onSignup, onLogin }) {
  return (
    <>
      <Navbar onOpenLogin={onOpenLogin} onOpenSignup={onOpenSignup} />

      <main>
        <Hero onOpenLogin={onOpenLogin} onOpenSignup={onOpenSignup} googleError={googleError} />
        <Introduction />
        <GetStarted onOpenLogin={onOpenLogin} />
      </main>

      <footer className="footer">
        <h3>DataMind AI</h3>
        <p>AI-powered data analysis platform.</p>
        <p>© 2026 DataMind AI. All rights reserved.</p>
      </footer>
      {authMode === "signup" && <SignupModal onClose={onCloseAuth} onSuccess={onSignup} />}
      {authMode === "login" && <LoginModal onClose={onCloseAuth} onLogin={onLogin} notice={notice} googleError={googleError} />}
    </>
  );
}

function SignupModal({ onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    emailOrPhone: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
    setSuccessMessage("");
  };

  const validatePassword = (password) => {
    const checks = [
      password.length >= 8,
      /[A-Z]/.test(password),
      /[a-z]/.test(password),
      /\d/.test(password),
      /[^A-Za-z0-9]/.test(password),
    ];

    return checks.every(Boolean);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const nextErrors = {};

    if (!formData.firstName.trim()) nextErrors.firstName = "First name is required.";
    if (!formData.lastName.trim()) nextErrors.lastName = "Last name is required.";
    if (!formData.emailOrPhone.trim()) nextErrors.emailOrPhone = "Email or phone number is required.";

    if (!validatePassword(formData.password)) {
      nextErrors.password = "Password must be at least 8 characters with uppercase, lowercase, a number, and a special character.";
    }

    if (!formData.confirmPassword) {
      nextErrors.confirmPassword = "Please confirm your password.";
    } else if (formData.confirmPassword !== formData.password) {
      nextErrors.confirmPassword = "Passwords do not match.";
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setSuccessMessage("");
      return;
    }

    const value = formData.emailOrPhone.trim();
    const isEmail = value.includes("@") || value.includes(".");
    const payload = {
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      email: isEmail ? value : "",
      phoneNumber: isEmail ? "" : value,
      password: formData.password,
      confirmPassword: formData.confirmPassword,
    };

    try {
      const result = await onSuccess(payload);

      setSuccessMessage(result.message || "Account created successfully. Please sign in.");
      setFormData({
        firstName: "",
        lastName: "",
        emailOrPhone: "",
        password: "",
        confirmPassword: "",
      });
    } catch (error) {
      setErrors((prev) => ({ ...prev, api: error.message || "Unable to connect to the server. Please try again." }));
      setSuccessMessage("");
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h3>Create account</h3>
          <button type="button" className="close-btn" onClick={onClose} aria-label="Close signup form">
            ×
          </button>
        </div>

        <form className="signup-form" onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="field-group">
              <label htmlFor="firstName">First name</label>
              <input id="firstName" name="firstName" value={formData.firstName} onChange={handleChange} />
              {errors.firstName && <span className="error-text">{errors.firstName}</span>}
            </div>

            <div className="field-group">
              <label htmlFor="lastName">Last name</label>
              <input id="lastName" name="lastName" value={formData.lastName} onChange={handleChange} />
              {errors.lastName && <span className="error-text">{errors.lastName}</span>}
            </div>
          </div>

          <div className="field-group">
            <label htmlFor="emailOrPhone">Email or phone number</label>
            <input id="emailOrPhone" name="emailOrPhone" type="text" value={formData.emailOrPhone} onChange={handleChange} />
            {errors.emailOrPhone && <span className="error-text">{errors.emailOrPhone}</span>}
          </div>

          <div className="field-group">
            <label htmlFor="password">Password</label>
            <div className="password-input-wrap">
              <input id="password" name="password" type={showPassword ? "text" : "password"} value={formData.password} onChange={handleChange} />
              <button type="button" className="visibility-btn" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide password" : "Show password"}>
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
            {errors.password && <span className="error-text">{errors.password}</span>}
          </div>

          <div className="field-group">
            <label htmlFor="confirmPassword">Confirm password</label>
            <div className="password-input-wrap">
              <input id="confirmPassword" name="confirmPassword" type={showConfirmPassword ? "text" : "password"} value={formData.confirmPassword} onChange={handleChange} />
              <button type="button" className="visibility-btn" onClick={() => setShowConfirmPassword(!showConfirmPassword)} aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}>
                {showConfirmPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
            {errors.confirmPassword && <span className="error-text">{errors.confirmPassword}</span>}
          </div>

          {successMessage && <div className="success-box">{successMessage}</div>}
          {errors.api && <div className="error-box">{errors.api}</div>}

          <button type="submit" className="create-account-btn">Create account</button>
        </form>
      </div>
    </div>
  );
}

function LoginModal({ onClose, onLogin, notice, googleError }) {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setErrorMessage("");
    try {
      await onLogin({ email: formData.email.trim(), password: formData.password });
    } catch (error) {
      setErrorMessage(error.message || "Login failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card login-card" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h3>Login</h3>
          <button type="button" className="close-btn" onClick={onClose} aria-label="Close login form">
            ×
          </button>
        </div>

        <form className="signup-form" onSubmit={handleSubmit}>
          {notice && <div className="success-box" role="status">{notice}</div>}
          {errorMessage && <div className="error-box" role="alert">{errorMessage}</div>}
          {googleError && <div className="error-box" role="alert">{googleError}</div>}
          <div className="field-group">
            <label htmlFor="login-email">Email</label>
            <input id="login-email" name="email" type="email" value={formData.email} onChange={handleChange} />
          </div>

          <div className="field-group">
            <label htmlFor="login-password">Password</label>
            <div className="password-input-wrap">
              <input id="login-password" name="password" type={showPassword ? "text" : "password"} value={formData.password} onChange={handleChange} />
              <button type="button" className="visibility-btn" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide password" : "Show password"}>
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>

          <button type="submit" className="create-account-btn" disabled={submitting}>
            {submitting ? "Signing in…" : "Login"}
          </button>

          <div className="divider login-divider">
            <span></span>
            OR CONTINUE WITH
            <span></span>
          </div>

          <GoogleSignInButton />
        </form>
      </div>
    </div>
  );
}

export default App;