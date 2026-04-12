import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const SCORE_COLOR = (score) => {
  if (score > 80) return '#dc3545';
  if (score > 65) return '#ff7043';
  return '#ffc107';
};

export default function HighRiskAlert({ buildings }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  if (!buildings?.length) return null;

  const top5 = [...buildings]
    .sort((a, b) => Number(b.risk_score) - Number(a.risk_score))
    .slice(0, 5);

  return (
    <div className="hra-widget">
      <button
        className={`hra-btn${open ? ' hra-btn--open' : ''}`}
        onClick={() => setOpen(o => !o)}
        title="Top 5 highest risk buildings"
      >
        🔥
        <span className="hra-badge">{top5.length}</span>
      </button>

      {open && (
        <div className="hra-panel">
          <div className="hra-panel-header">
            <span>🔥 Highest Risk</span>
            <button className="hra-close" onClick={() => setOpen(false)}>✕</button>
          </div>
          <div className="hra-list">
            {top5.map((b, i) => {
              const score = Number(b.risk_score);
              const color = SCORE_COLOR(score);
              return (
                <button
                  key={b.building_id}
                  className="hra-item"
                  onClick={() => { navigate(`/map/building/${b.building_id}`); setOpen(false); }}
                >
                  <span className="hra-rank" style={{ color }}>{i + 1}</span>
                  <div className="hra-info">
                    <span className="hra-name">{b.building_name || b.address}</span>
                    <span className="hra-location">{b.prefecture || b.address}</span>
                  </div>
                  <span className="hra-score" style={{ color, borderColor: color }}>
                    {score.toFixed(1)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
