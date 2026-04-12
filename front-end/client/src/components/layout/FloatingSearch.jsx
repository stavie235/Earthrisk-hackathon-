import { useState, useEffect, useRef } from "react";
import "../../styles/FacilitiesGrid.css";

const BUILDING_TYPES = ['residential', 'commercial', 'industrial', 'mixed', 'other'];
const FLOOD_ZONES = ['none', 'low', 'medium', 'high'];
const EARTHQUAKE_ZONES = ['none', 'low', 'medium', 'high'];

export default function FloatingSearch({ onSearch, filters, buildings, onBuildingClick }) {
  const [openDropdown, setOpenDropdown] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setOpenDropdown(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      onSearch({ q: inputValue });
      setShowSuggestions(false);
      setSuggestions([]);
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setInputValue(value);
    if (value.length > 1) {
      const filtered = buildings.filter(b =>
        (b.address || '').toLowerCase().includes(value.toLowerCase()) ||
        (b.building_name || '').toLowerCase().includes(value.toLowerCase())
      ).slice(0, 5);
      setSuggestions(filtered);
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
      if (value === "") onSearch({ q: "" });
    }
  };

  const getHighlightedText = (text, highlight) => {
    if (!text) return null;
    const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
    return (
      <span>
        {parts.map((part, i) =>
          part.toLowerCase() === highlight.toLowerCase()
            ? <b key={i} style={{ color: '#ddc41eff' }}>{part}</b>
            : part
        )}
      </span>
    );
  };

  const toggleDropdown = (label) => {
    setOpenDropdown(openDropdown === label ? null : label);
  };

  const toggleArrayFilter = (key, value) => {
    const current = filters[key] || [];
    const next = current.includes(value)
      ? current.filter(item => item !== value)
      : [...current, value];
    onSearch({ [key]: next });
  };

  const anyFilterActive = filters.building_type?.length > 0 ||
    filters.flood_zone?.length > 0 ||
    filters.earthquake_zone?.length > 0 ||
    filters.risk_min !== "" ||
    filters.risk_max !== "";

  return (
    <div className="search-filter-container">
      <div className="search-bar-wrapper">
        <div className="search-bar">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            value={inputValue}
            onKeyDown={handleKeyDown}
            onFocus={() => { if (inputValue.length > 1) setShowSuggestions(true); }}
            placeholder="Search buildings by name or address..."
            onChange={handleInputChange}
          />
          {inputValue && (
            <span
              className="clear-icon"
              onClick={() => { setInputValue(""); onSearch({ q: "" }); setShowSuggestions(false); setSuggestions([]); }}
              style={{ cursor: 'pointer', marginRight: '10px' }}
            >
              ✖
            </span>
          )}
        </div>

        {showSuggestions && suggestions.length > 0 && (
          <ul className="suggestions-list">
            {suggestions.map((b) => (
              <li key={b.building_id} onClick={() => {
                onBuildingClick(b);
                setShowSuggestions(false);
                setSuggestions([]);
              }}>
                {getHighlightedText(b.building_name || b.address, inputValue)}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="filter-pill-container" ref={wrapperRef}>

        {/* Building Type */}
        <div className="dropdown-wrapper">
          <button
            className={`filter-pill ${filters.building_type?.length ? 'active' : ''}`}
            onClick={() => toggleDropdown('building_type')}
          >
            Type {filters.building_type?.length ? `(${filters.building_type.length})` : ''}
          </button>
          {openDropdown === 'building_type' && (
            <div className="dropdown-menu">
              {BUILDING_TYPES.map((t) => (
                <button
                  key={t}
                  className={filters.building_type?.includes(t) ? 'selected' : ''}
                  onClick={() => toggleArrayFilter('building_type', t)}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Flood Zone */}
        <div className="dropdown-wrapper">
          <button
            className={`filter-pill ${filters.flood_zone?.length ? 'active' : ''}`}
            onClick={() => toggleDropdown('flood_zone')}
          >
            Flood Zone {filters.flood_zone?.length ? `(${filters.flood_zone.length})` : ''}
          </button>
          {openDropdown === 'flood_zone' && (
            <div className="dropdown-menu">
              {FLOOD_ZONES.map((z) => (
                <button
                  key={z}
                  className={filters.flood_zone?.includes(z) ? 'selected' : ''}
                  onClick={() => toggleArrayFilter('flood_zone', z)}
                >
                  {z.charAt(0).toUpperCase() + z.slice(1)}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Earthquake Zone */}
        <div className="dropdown-wrapper">
          <button
            className={`filter-pill ${filters.earthquake_zone?.length ? 'active' : ''}`}
            onClick={() => toggleDropdown('earthquake_zone')}
          >
            Seismic Zone {filters.earthquake_zone?.length ? `(${filters.earthquake_zone.length})` : ''}
          </button>
          {openDropdown === 'earthquake_zone' && (
            <div className="dropdown-menu">
              {EARTHQUAKE_ZONES.map((z) => (
                <button
                  key={z}
                  className={filters.earthquake_zone?.includes(z) ? 'selected' : ''}
                  onClick={() => toggleArrayFilter('earthquake_zone', z)}
                >
                  {z.charAt(0).toUpperCase() + z.slice(1)}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Risk Score Range */}
        <div className="dropdown-wrapper">
          <button
            className={`filter-pill ${(filters.risk_min !== "" || filters.risk_max !== "") ? 'active' : ''}`}
            onClick={() => toggleDropdown('risk_range')}
          >
            Risk {filters.risk_min !== "" || filters.risk_max !== ""
              ? `(${filters.risk_min || '0'}–${filters.risk_max || '100'})`
              : ''}
          </button>
          {openDropdown === 'risk_range' && (
            <div className="dropdown-menu" style={{ padding: '12px', minWidth: '220px' }}>
              <div style={{ display: 'flex', gap: '4px', marginBottom: '14px' }}>
                <button
                  className={filters.risk_min === "65" && filters.risk_max === "" ? 'selected' : ''}
                  onClick={() => onSearch({ risk_min: "65", risk_max: "" })}
                  style={{ flex: 1, fontSize: '11px' }}
                >🔴 High</button>
                <button
                  className={filters.risk_min === "35" && filters.risk_max === "65" ? 'selected' : ''}
                  onClick={() => onSearch({ risk_min: "35", risk_max: "65" })}
                  style={{ flex: 1, fontSize: '11px' }}
                >🟡 Medium</button>
                <button
                  className={filters.risk_min === "" && filters.risk_max === "35" ? 'selected' : ''}
                  onClick={() => onSearch({ risk_min: "", risk_max: "35" })}
                  style={{ flex: 1, fontSize: '11px' }}
                >🟢 Low</button>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                  <span>Min</span>
                  <span style={{ fontWeight: 600, color: '#fff' }}>{filters.risk_min || '0'}</span>
                </div>
                <input
                  type="range"
                  min="0" max="100" step="1"
                  value={filters.risk_min || 0}
                  onChange={(e) => {
                    const val = e.target.value;
                    onSearch({ risk_min: val === "0" ? "" : val });
                  }}
                  style={{ width: '100%', cursor: 'pointer' }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                  <span>Max</span>
                  <span style={{ fontWeight: 600, color: '#fff' }}>{filters.risk_max || '100'}</span>
                </div>
                <input
                  type="range"
                  min="0" max="100" step="1"
                  value={filters.risk_max || 100}
                  onChange={(e) => {
                    const val = e.target.value;
                    onSearch({ risk_max: val === "100" ? "" : val });
                  }}
                  style={{ width: '100%', cursor: 'pointer' }}
                />
              </div>
            </div>
          )}
        </div>

        {anyFilterActive && (
          <button
            className="clear-filters-btn"
            onClick={() => onSearch({
              building_type: [],
              flood_zone: [],
              earthquake_zone: [],
              risk_min: "",
              risk_max: ""
            })}
          >
            Clear All
          </button>
        )}
      </div>
    </div>
  );
}
