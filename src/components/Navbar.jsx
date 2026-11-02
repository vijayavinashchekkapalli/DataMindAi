import { Leaf } from "lucide-react";

function Navbar({ onOpenLogin, onOpenSignup }) {
  return (
    <nav className="navbar">
      <a href="#" className="logo">
        <Leaf size={27} />
        <span>DataMind <b>AI</b></span>
      </a>

      <div className="nav-links">
        <a href="#about">About</a>
        <a href="#introduction">Ask Anything</a>
      </div>

      <div className="nav-buttons">
        <button type="button" className="signin" onClick={onOpenLogin}>Sign In</button>
        <button type="button" className="signup" onClick={onOpenSignup}>Sign Up</button>
      </div>
    </nav>
  );
}

export default Navbar;