import { ArrowRight } from "lucide-react";
import GoogleSignInButton from "./GoogleSignInButton";

function Hero({ onOpenLogin, onOpenSignup, googleError }) {
  return (
    <section className="hero">

      <div className="hero-badge">
        <span className="pulse"></span>
        Intelligent Business Analytics
      </div>

      <h1>
        DATAMIND<span>-AI</span>
      </h1>

      <h2>AI-powered data analysis platform</h2>

      <p className="hero-description">
        Transform your business data into meaningful insights.
        Discover sales trends, understand your business performance
        and predict future product demand with the power of AI.
      </p>

      <div className="hero-buttons">
        <button type="button" className="primary-btn" onClick={onOpenSignup}>
          Create Account <ArrowRight size={18} />
        </button>

        <button type="button" className="secondary-btn" onClick={onOpenLogin}>
          Login
        </button>
      </div>

      <div className="divider">
        <span></span>
        OR CONTINUE WITH
        <span></span>
      </div>

      <GoogleSignInButton />
      {googleError && <p className="error-box google-error" role="alert">{googleError}</p>}

      <div className="hero-bottom">
        <span>Smart Analytics</span>
        <span>•</span>
        <span>AI Predictions</span>
        <span>•</span>
        <span>Business Intelligence</span>
      </div>

    </section>
  );
}

export default Hero;