import { ArrowRight, Sparkles } from "lucide-react";

function GetStarted({ onOpenLogin }) {
  return (
    <section className="get-started" id="get-started">

      <div className="get-started-content">

        <div className="started-icon">
          <Sparkles size={25} />
        </div>

        <span>YOUR BUSINESS. YOUR DATA. YOUR FUTURE.</span>

        <h2>
          Ready to Make
          <br />
          Smarter Decisions?
        </h2>

        <p>
          Start your journey with DataMind AI.
          Turn your sales data into powerful business intelligence.
        </p>

        <button type="button" className="started-btn" onClick={onOpenLogin}>
          Get Started <ArrowRight size={19} />
        </button>

      </div>

    </section>
  );
}

export default GetStarted;