import { useState } from "react";
import "../../styles/profile/EcologicalUpgrades.css";

const EcologicalUpgrades = ({ profile }) => {
  const [expandedUpgrade, setExpandedUpgrade] = useState(null);

  // Recommended upgrades based on building characteristics and risk factors
  const getRecommendedUpgrades = () => {
    const upgrades = [];

    // Base recommendations for all buildings
    upgrades.push({
      id: 1,
      title: "Install Solar Panels",
      category: "Renewable Energy",
      difficulty: "Medium",
      estimatedCost: "$10,000 - $25,000",
      estimatedSavings: "15-20% reduction in utilities",
      timeline: "6-12 months",
      benefits: [
        "Reduce carbon footprint",
        "Lower energy costs",
        "Increase property value",
        "Potential insurance discounts"
      ],
      description: "Solar panels convert sunlight into electricity, reducing dependence on grid power and lowering energy bills significantly."
    });

    upgrades.push({
      id: 2,
      title: "Improve Insulation",
      category: "Energy Efficiency",
      difficulty: "Medium",
      estimatedCost: "$5,000 - $15,000",
      estimatedSavings: "10-15% reduction in heating/cooling costs",
      timeline: "2-4 weeks",
      benefits: [
        "Better temperature control",
        "Reduced energy consumption",
        "Improved comfort",
        "Lower environmental impact"
      ],
      description: "Upgrading insulation in walls, attics, and basements reduces heat loss in winter and heat gain in summer."
    });

    upgrades.push({
      id: 3,
      title: "Install Green Roof",
      category: "Water Management",
      difficulty: "Hard",
      estimatedCost: "$15,000 - $40,000",
      estimatedSavings: "20-25% reduction in storm water runoff",
      timeline: "1-3 months",
      benefits: [
        "Reduce flooding risk",
        "Improve air quality",
        "Water management",
        "Urban heat island reduction"
      ],
      description: "Green roofs with vegetation absorb rainwater, reducing storm surge and flood risk while providing insulation benefits."
    });

    upgrades.push({
      id: 4,
      title: "Rainwater Harvesting System",
      category: "Water Conservation",
      difficulty: "Medium",
      estimatedCost: "$3,000 - $8,000",
      estimatedSavings: "25-30% reduction in water usage",
      timeline: "1-2 weeks",
      benefits: [
        "Reduce water consumption",
        "Lower water bills",
        "Reduce flood risk",
        "Sustainable water source"
      ],
      description: "Collect and store rainwater for irrigation, reducing municipal water usage and alleviating flood pressure."
    });

    upgrades.push({
      id: 5,
      title: "Earthquake-Resistant Foundation Reinforcement",
      category: "Structural Safety",
      difficulty: "Hard",
      estimatedCost: "$20,000 - $50,000",
      estimatedSavings: "Up to 30% insurance premium reduction",
      timeline: "2-4 months",
      benefits: [
        "Increased structural safety",
        "Better earthquake resilience",
        "Significant insurance savings",
        "Property value increase"
      ],
      description: "Reinforce building foundation and connections to withstand earthquake forces, reducing vulnerability to seismic activity."
    });

    upgrades.push({
      id: 6,
      title: "Flood-Resistant Materials & Barriers",
      category: "Flood Protection",
      difficulty: "Hard",
      estimatedCost: "$8,000 - $25,000",
      estimatedSavings: "20-40% flood insurance reduction",
      timeline: "2-6 weeks",
      benefits: [
        "Flood damage prevention",
        "Water-resistant design",
        "Insurance cost reduction",
        "Increased safety"
      ],
      description: "Install flood barriers, elevate utilities, and use water-resistant materials to minimize flood damage."
    });

    upgrades.push({
      id: 7,
      title: "Smart Building Management System",
      category: "Technology & Efficiency",
      difficulty: "Easy",
      estimatedCost: "$5,000 - $15,000",
      estimatedSavings: "8-12% reduction in energy costs",
      timeline: "2-4 weeks",
      benefits: [
        "Real-time energy monitoring",
        "Automated climate control",
        "Waste reduction",
        "Lower operational costs"
      ],
      description: "IoT sensors and smart systems optimize energy usage, heating, cooling, and lighting based on occupancy and weather."
    });

    upgrades.push({
      id: 8,
      title: "Energy-Efficient HVAC System",
      category: "Energy Efficiency",
      difficulty: "Medium",
      estimatedCost: "$6,000 - $12,000",
      estimatedSavings: "15-20% reduction in heating/cooling costs",
      timeline: "1-2 weeks",
      benefits: [
        "Better climate control",
        "Lower energy bills",
        "Improved air quality",
        "Modern efficiency standards"
      ],
      description: "Replace old HVAC systems with Energy Star certified units that use less energy while maintaining comfort."
    });

    upgrades.push({
      id: 9,
      title: "Fire-Resistant Landscaping",
      category: "Fire Safety",
      difficulty: "Easy",
      estimatedCost: "$2,000 - $5,000",
      estimatedSavings: "10-15% fire insurance reduction",
      timeline: "1-2 weeks",
      benefits: [
        "Reduce wildfire risk",
        "Lower fire insurance rates",
        "Defensible space creation",
        "Property protection"
      ],
      description: "Clear vegetation, maintain distance from structures, and use fire-resistant plants to create defensible space."
    });

    upgrades.push({
      id: 10,
      title: "Cool Roof Installation",
      category: "Climate Resilience",
      difficulty: "Easy",
      estimatedCost: "$3,000 - $8,000",
      estimatedSavings: "10-15% air conditioning cost reduction",
      timeline: "1 week",
      benefits: [
        "Reduce heat absorption",
        "Lower cooling costs",
        "Reduce urban heat effect",
        "Extend roof lifespan"
      ],
      description: "Install light-colored, reflective roofing to minimize heat absorption and reduce cooling needs."
    });

    return upgrades;
  };

  const upgrades = getRecommendedUpgrades();

  const getDifficultyColor = (difficulty) => {
    switch (difficulty.toLowerCase()) {
      case 'easy':
        return '#4caf50';
      case 'medium':
        return '#ff9800';
      case 'hard':
        return '#f44336';
      default:
        return '#999';
    }
  };

  const getCategoryIcon = (category) => {
    const icons = {
      "Renewable Energy": "☀️",
      "Energy Efficiency": "⚡",
      "Water Management": "💧",
      "Water Conservation": "💧",
      "Structural Safety": "🏗️",
      "Flood Protection": "🚧",
      "Technology & Efficiency": "🤖",
      "Fire Safety": "🔥",
      "Climate Resilience": "🌡️"
    };
    return icons[category] || "🏢";
  };

  return (
    <div className="ecological-upgrades-container">
      <h3>Recommended Ecological Upgrades</h3>
      <p className="upgrades-intro">
        Enhance your building's sustainability and reduce insurance risk with these eco-friendly improvements.
        Each upgrade can help lower your environmental impact and potentially reduce insurance premiums.
      </p>

      <div className="upgrades-grid">
        {upgrades.map((upgrade) => (
          <div
            key={upgrade.id}
            className={`upgrade-card ${expandedUpgrade === upgrade.id ? 'expanded' : ''}`}
            onClick={() => setExpandedUpgrade(expandedUpgrade === upgrade.id ? null : upgrade.id)}
          >
            <div className="upgrade-header">
              <span className="upgrade-icon">{getCategoryIcon(upgrade.category)}</span>
              <div className="upgrade-title-section">
                <h4>{upgrade.title}</h4>
                <span className="upgrade-category">{upgrade.category}</span>
              </div>
              <span className="expand-indicator">
                {expandedUpgrade === upgrade.id ? '−' : '+'}
              </span>
            </div>

            <div className="upgrade-quick-info">
              <span
                className="difficulty-badge"
                style={{ backgroundColor: getDifficultyColor(upgrade.difficulty) }}
              >
                {upgrade.difficulty}
              </span>
              <span className="cost">{upgrade.estimatedCost}</span>
              <span className="savings">{upgrade.estimatedSavings}</span>
            </div>

            {expandedUpgrade === upgrade.id && (
              <div className="upgrade-details">
                <p className="upgrade-description">{upgrade.description}</p>

                <div className="upgrade-info">
                  <div className="info-item">
                    <span className="info-label">Timeline:</span>
                    <span className="info-value">{upgrade.timeline}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Estimated Cost:</span>
                    <span className="info-value">{upgrade.estimatedCost}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Potential Savings:</span>
                    <span className="info-value">{upgrade.estimatedSavings}</span>
                  </div>
                </div>

                <div className="upgrade-benefits">
                  <h5>Key Benefits:</h5>
                  <ul>
                    {upgrade.benefits.map((benefit, idx) => (
                      <li key={idx}>✓ {benefit}</li>
                    ))}
                  </ul>
                </div>

                <button className="upgrade-cta">Learn More & Start Planning</button>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="upgrades-advice">
        <h4>💡 Best Practices</h4>
        <ul>
          <li>Start with easy, cost-effective upgrades like fire-resistant landscaping</li>
          <li>Combine upgrades strategically (e.g., solar panels + smart building system)</li>
          <li>Check for government rebates and tax incentives</li>
          <li>Prioritize upgrades based on your building's specific risks</li>
          <li>Contact your insurance provider about premium discounts for improvements</li>
        </ul>
      </div>
    </div>
  );
};

export default EcologicalUpgrades;
