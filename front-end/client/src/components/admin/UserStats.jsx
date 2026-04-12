import React, { useState, useEffect } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, 
  CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import "../../styles/profile/ProfileStats.css";

  
const UserTab = ({ data }) => {
  const [isMounted, setIsMounted] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState('growth');

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const growthData = data?.userGrowth || [];
  const retentionData = data?.returningUsers || [];

  const formatInteger = (value) => Math.floor(value);

  if (!isMounted) return <div className="stats-loading">Loading charts...</div>;

  return (
    <div className="full-page-content animate-fadeIn">
      {/* Sub-Navigation */}
      <div className="flex gap-4 mb-4">
        <button 
          onClick={() => setActiveSubTab('growth')}
          className={`btn-tab ${activeSubTab === 'growth' ? 'active' : ''}`}
        >
          User Growth
        </button>
        <button 
          onClick={() => setActiveSubTab('retention')}
          className={`btn-tab ${activeSubTab === 'retention' ? 'active' : ''}`}
        >
          User Retention
        </button>
      </div>

      <div className="stats-grid full-height">
        {/* TAB 1: USER GROWTH (Area Chart) */}
        {activeSubTab === 'growth' && (
          <div className="chart-card full-size">
            <h3>New User Registrations (Monthly)</h3>
            <div style={{ width: '100%', flex: 1 }}>
              {growthData.length > 0 ? (
                <ResponsiveContainer width="100%" height="90%">
                  <AreaChart data={growthData} margin={{ top: 20, right: 30, bottom: 20, left: 10 }}>
                    <defs>
                      <linearGradient id="colorGrowth" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4CAF50" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#4CAF50" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#dcdcdc" />
                    <XAxis 
                      dataKey="month_label" 
                      tick={{fill: '#555', fontSize: 12}} 
                      axisLine={false} 
                      tickLine={false}
                    />
                    <YAxis 
                      tick={{fill: '#555', fontSize: 12}} 
                      axisLine={false} 
                      tickLine={false} 
                    />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 16px rgba(0,0,0,0.1)' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="new_registrations" 
                      name="New Users"
                      stroke="#4CAF50" 
                      fillOpacity={1} 
                      fill="url(#colorGrowth)" 
                      strokeWidth={3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="no-data">No growth data available</div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: USER RETENTION (Bar Chart) */}
        {activeSubTab === 'retention' && (
          <div className="chart-card full-size">
            <h3>Returning Users (Active Sessions)</h3>
            <div style={{ width: '100%', flex: 1 }}>
              {retentionData.length > 0 ? (
                <ResponsiveContainer width="100%" height="90%">
                  <BarChart data={retentionData} margin={{ top: 10, right: 30, bottom: 20, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#dcdcdc" />
                    <XAxis 
                      dataKey="month_label" 
                      tick={{fill: '#555', fontSize: 12}} 
                      axisLine={false} 
                      tickLine={false} 
                    />
                    <YAxis 
                      allowDecimals={false} // Force whole numbers
                      tickFormatter={formatInteger}
                      tick={{fill: '#555', fontSize: 12}} 
                      axisLine={false} 
                      tickLine={false} 
                    />
                    <Tooltip 
                      cursor={{fill: '#f5f5f5'}}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 16px rgba(0,0,0,0.1)' }}
                    />
                    <Legend verticalAlign="top" height={36}/>
                    <Bar 
                      dataKey="returning_user_count" 
                      name="Returning Users" 
                      fill="#2196F3" 
                      radius={[4, 4, 0, 0]} 
                      barSize={40}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="no-data">No retention data available</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserTab;