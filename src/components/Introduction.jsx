import {
  BarChart3,
  Database,
  BrainCircuit,
  ArrowUpRight
} from "lucide-react";

function Introduction() {

  const features = [
    {
      icon: <Database size={30} />,
      title: "Automatic Data Cleaning",
      description:
        "Upload your CSV or Excel files. DataMind AI automatically identifies missing values, duplicates and incorrect records."
    },
    {
      icon: <BarChart3 size={30} />,
      title: "Smart Data Analysis",
      description:
        "Understand your business performance through interactive charts, sales reports and meaningful insights."
    },
    {
      icon: <BrainCircuit size={30} />,
      title: "AI Sales Prediction",
      description:
        "Predict future product demand and discover which products are likely to sell more in the coming days."
    }
  ];

  return (
    <section className="introduction" id="introduction">

      <div className="section-heading" id="about">
        <span className="section-label">DISCOVER DATAMIND AI</span>

        <h2>
          Your Data Has a Story.
          <br />
          <span>Let AI Tell It.</span>
        </h2>

        <p>
          We turn complicated business data into simple,
          understandable and actionable insights.
          Make smarter decisions with DataMind AI.
        </p>
      </div>

      <div className="feature-container">

        {features.map((feature, index) => (
          <div className="feature-card" key={index}>

            <div className="feature-icon">
              {feature.icon}
            </div>

            <h3>{feature.title}</h3>

            <p>{feature.description}</p>

            <a href="#get-started">
              Explore More <ArrowUpRight size={17} />
            </a>

          </div>
        ))}

      </div>

    </section>
  );
}

export default Introduction;