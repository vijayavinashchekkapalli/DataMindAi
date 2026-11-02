import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Leaf,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  ArrowLeft
} from "lucide-react";

import "./Signup.css";

function Signup() {

  const navigate = useNavigate();

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    contact: "",
    password: "",
    confirmPassword: ""
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [message, setMessage] = useState("");

  const passwordRules = {
    length: form.password.length >= 8,
    uppercase: /[A-Z]/.test(form.password),
    lowercase: /[a-z]/.test(form.password),
    number: /[0-9]/.test(form.password),
    special: /[^A-Za-z0-9]/.test(form.password)
  };

  const strongPassword =
    Object.values(passwordRules).every(Boolean);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });

    setMessage("");
  };

  const validateContact = (value) => {
    const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phone = /^\+?[0-9]{10,15}$/;

    return email.test(value) || phone.test(value);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!form.firstName.trim() || !form.lastName.trim()) {
      setMessage("Please enter your first and last name.");
      return;
    }

    if (!validateContact(form.contact.trim())) {
      setMessage("Enter a valid email address or phone number.");
      return;
    }

    if (!strongPassword) {
      setMessage("Please create a strong password.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    setMessage("Account details validated successfully!");

    // Frontend demonstration only.
    // Actual account creation will be connected to the backend.

    setTimeout(() => {
      navigate("/login");
    }, 1500);
  };

  const Rule = ({ valid, text }) => (
    <div className={`password-rule ${valid ? "valid" : "invalid"}`}>
      {valid
        ? <CheckCircle size={15} />
        : <XCircle size={15} />
      }
      <span>{text}</span>
    </div>
  );

  return (
    <div className="signup-page">

      <div className="signup-card">

        <Link to="/" className="back-home">
          <ArrowLeft size={17} />
          Back to Home
        </Link>

        <div className="signup-logo">
          <Leaf size={30} />
          <span>DataMind <b>AI</b></span>
        </div>

        <h1>Create Your Account</h1>

        <p className="signup-subtitle">
          Start your journey with intelligent business analytics.
        </p>

        <form onSubmit={handleSubmit}>

          <div className="name-fields">

            <div className="input-group">
              <label>First Name</label>

              <input
                type="text"
                name="firstName"
                placeholder="Enter first name"
                value={form.firstName}
                onChange={handleChange}
                required
              />
            </div>

            <div className="input-group">
              <label>Last Name</label>

              <input
                type="text"
                name="lastName"
                placeholder="Enter last name"
                value={form.lastName}
                onChange={handleChange}
                required
              />
            </div>

          </div>

          <div className="input-group">
            <label>Email or Phone Number</label>

            <input
              type="text"
              name="contact"
              placeholder="Enter email or phone number"
              value={form.contact}
              onChange={handleChange}
              required
            />
          </div>

          <div className="input-group">
            <label>Password</label>

            <div className="password-input">

              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Create a strong password"
                value={form.password}
                onChange={handleChange}
                required
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
              </button>

            </div>
          </div>

          <div className="password-rules">

            <p>Password must contain:</p>

            <div className="rules-grid">

              <Rule
                valid={passwordRules.length}
                text="Minimum 8 characters"
              />

              <Rule
                valid={passwordRules.uppercase}
                text="One uppercase letter"
              />

              <Rule
                valid={passwordRules.lowercase}
                text="One lowercase letter"
              />

              <Rule
                valid={passwordRules.number}
                text="One number"
              />

              <Rule
                valid={passwordRules.special}
                text="One special character"
              />

            </div>

            {form.password && (
              <div className="strength-text">
                {strongPassword
                  ? "✓ Strong password"
                  : "Password requirements not completed"
                }
              </div>
            )}

          </div>

          <div className="input-group">
            <label>Confirm Password</label>

            <div className="password-input">

              <input
                type={showConfirm ? "text" : "password"}
                name="confirmPassword"
                placeholder="Re-enter your password"
                value={form.confirmPassword}
                onChange={handleChange}
                required
              />

              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
              >
                {showConfirm ? <EyeOff size={19} /> : <Eye size={19} />}
              </button>

            </div>

            {form.confirmPassword && (
              <small className={
                form.password === form.confirmPassword
                  ? "match-success"
                  : "match-error"
              }>
                {form.password === form.confirmPassword
                  ? "Passwords match"
                  : "Passwords do not match"
                }
              </small>
            )}

          </div>

          {message && (
            <div className={
              message.includes("successfully")
                ? "success-message"
                : "error-message"
            }>
              {message}
            </div>
          )}

          <button
            type="submit"
            className="create-account-btn"
            disabled={
              !strongPassword ||
              !form.firstName.trim() ||
              !form.lastName.trim() ||
              !validateContact(form.contact.trim()) ||
              form.password !== form.confirmPassword
            }
          >
            Create Account
          </button>

        </form>

        <div className="signin-link">
          Already have an account?
          <Link to="/login"> Sign In</Link>
        </div>

      </div>

    </div>
  );
}

export default Signup;