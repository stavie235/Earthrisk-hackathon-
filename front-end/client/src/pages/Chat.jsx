import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import api from "../axiosConfig";
import "../styles/Chat.css";

const QUICK_PROMPTS = {
  Risk_Explanation_Agent: [
    "Explain the risk profile of BLD_0290, a 53-year-old wooden Airbnb house in Attica (Cholargos). Risk score: 80.7/100. It is near wildland, has alarm and cameras but only basic coverage. Annual premium is just €172.04. Why is the risk so high and is the premium adequate?",
    "Compare BLD_0040 in Xanthi (risk score 6.4, 4-year-old concrete house, full coverage, alarm + cameras, not near nature, premium €43.37) vs BLD_0387 in Kefalonia (Κεφαλονιά) (risk score 79.0, 48-year-old wooden Airbnb villa near wildland, underinsured at €140,602 vs actual €200,860). What explains the difference?",
    "Analyze BLD_0568, a 36-year-old wooden Airbnb apartment in Heraklion (Crete). Risk score 78.6, high seismic zone (Zone 3), near wildland, high crime rate, underinsured — declared €70,766 vs actual €101,095. Premium is only €108.99. Is this property adequately covered?",
  ],
  Alerting_Agent: [
    "Generate a risk alert for Kefalonia (Κεφαλονιά). BLD_0387 scores 79.0 — wooden Airbnb villa, 48 years old, near wildland, underinsured by 30% (declared €140,602 vs actual €200,860), high crime rate. Risk has been climbing 4–5 points per year. What alert level and actions are required?",
    "Issue an alert for BLD_0002 in Cyclades: risk score 64.4, wooden Airbnb apartment, 47 years old, high seismic zone (Zone 3), underinsured at €128,497 vs actual €183,568, high crime. Risk increased from 48.0 to 64.4 over the past year. What immediate escalation is needed?",
  ],
  Decision_Support_Agent: [
    "Suggest insurance actions for BLD_0387 in Kefalonia (Κεφαλονιά) (Razata): risk score 79.0 (High), wooden construction, 48 years old, Airbnb, near wildland, underinsured — declared €140,602 vs actual €200,860. Premium €332.85. Has alarm and cameras. What should the insurer change at renewal?",
    "What should we recommend for BLD_0025 in Lesvos (Arisvi): risk score 74.3, wooden Airbnb, 9 years old, near wildland, high seismic zone, underinsured (declared €92,183 vs actual €131,690), no alarm but has cameras, full coverage. Premium is €246.51. What mitigation steps make sense?",
  ],
  Data_Interpreter_Agent: [
    "Interpret this record for BLD_0049 (Zakynthos, Laganas): risk_score=72.0, annual_premium=€464.66, construction=Panel, seismic_zone=Zone 1 (Low), near_nature=True, crime_rate=High, usage=Airbnb, building_age=53 years, actual_value=€308,607, declared_value=€216,025, underinsured=True, has_alarm=True, has_cameras=True, coverage=Full. What does this data reveal about the risk-premium relationship?",
    "Analyze the risk pattern across these three island properties: BLD_0290 Attica score 80.7 wooden Airbnb age 53, BLD_0387 Kefalonia (Κεφαλονιά) score 79.0 wooden Airbnb age 48 underinsured, BLD_0568 Heraklion score 78.6 wooden Airbnb age 36 high seismic. What common risk drivers do you identify and what does this mean for the insurer's island portfolio?",
  ],
};

export default function Chat() {
  const navigate = useNavigate();
  const [agents, setAgents] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    api.get("/agent/list").then(res => setAgents(res.data)).catch(console.error);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const selectAgent = (agent) => {
    setSelectedAgent(agent);
    setMessages([]);
    setInput("");
  };

  const sendMessage = async (text) => {
    const msg = (text || input).trim();
    if (!msg || !selectedAgent || loading) return;

    setInput("");
    setMessages(prev => [...prev, { role: "user", content: msg }]);
    setLoading(true);

    try {
      const res = await api.post("/agent/chat", {
        agentId: selectedAgent.id,
        message: msg,
      });
      setMessages(prev => [...prev, { role: "agent", content: res.data.reply }]);
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || "Something went wrong.";
      setMessages(prev => [...prev, { role: "agent", content: `Error: ${errMsg}` }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleTextareaChange = (e) => {
    setInput(e.target.value);
    // Auto-resize
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 140) + "px";
  };

  const quickPrompts = selectedAgent ? (QUICK_PROMPTS[selectedAgent.name] || []) : [];

  return (
    <div className="chat-page">
      {/* Header */}
      <header className="chat-header">
        <button className="chat-back-btn" onClick={() => navigate("/map")}>
          ← Back to Map
        </button>
        <div>
          <div className="chat-header-title">EarthRisk AI Agents</div>
          <div className="chat-header-subtitle">Powered by IBM WatsonX Orchestrate</div>
        </div>
      </header>

      <div className="chat-body">
        {/* Sidebar — agent selector */}
        <aside className="chat-sidebar">
          <div className="chat-sidebar-label">Agents</div>
          {agents.map(agent => (
            <button
              key={agent.id}
              className={`agent-card ${selectedAgent?.id === agent.id ? "active" : ""}`}
              onClick={() => selectAgent(agent)}
            >
              <div className="agent-card-top">
                <span className="agent-dot" style={{ background: agent.color }} />
                <span className="agent-card-name">{agent.label}</span>
              </div>
              <div className="agent-card-desc">{agent.description}</div>
            </button>
          ))}
        </aside>

        {/* Main */}
        <div className="chat-main">
          {!selectedAgent ? (
            <div className="chat-no-agent">Select an agent from the left to start</div>
          ) : (
            <>
              {/* Active agent banner */}
              <div className="chat-agent-banner">
                <span className="chat-agent-banner-dot" style={{ background: selectedAgent.color }} />
                <span className="chat-agent-banner-name">{selectedAgent.label}</span>
                <span className="chat-agent-banner-hint">Responds in Greek · Shift+Enter for new line</span>
              </div>

              {/* Messages */}
              <div className="chat-messages">
                {messages.length === 0 && !loading && (
                  <div className="chat-empty">
                    <div className="chat-empty-icon">🤖</div>
                    <div className="chat-empty-title">Ready to analyse</div>
                    <div className="chat-empty-sub">
                      Type a message or use a quick-start prompt below
                    </div>
                    {quickPrompts.length > 0 && (
                      <div className="quick-prompts">
                        {quickPrompts.map((p, i) => (
                          <button
                            key={i}
                            className="quick-prompt-btn"
                            onClick={() => sendMessage(p)}
                          >
                            {p.length > 90 ? p.slice(0, 90) + "…" : p}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {messages.map((msg, i) => (
                  <div key={i} className={`message ${msg.role}`}>
                    <div className="message-label">
                      {msg.role === "user" ? "You" : selectedAgent.label}
                    </div>
                    <div className="message-bubble"><ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown></div>
                  </div>
                ))}

                {loading && (
                  <div className="message agent">
                    <div className="message-label">{selectedAgent.label}</div>
                    <div className="typing-indicator">
                      <div className="typing-dot" />
                      <div className="typing-dot" />
                      <div className="typing-dot" />
                    </div>
                  </div>
                )}

                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div className="chat-input-area">
                <div className="chat-input-row">
                  <textarea
                    ref={textareaRef}
                    className="chat-textarea"
                    placeholder={`Ask ${selectedAgent.label}…`}
                    value={input}
                    onChange={handleTextareaChange}
                    onKeyDown={handleKeyDown}
                    disabled={loading}
                    rows={1}
                  />
                  <button
                    className="chat-send-btn"
                    onClick={() => sendMessage()}
                    disabled={loading || !input.trim()}
                  >
                    {loading ? "…" : "Send"}
                  </button>
                </div>
                <div className="chat-input-hint">Enter to send · Shift+Enter for new line</div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
