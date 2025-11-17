import React from 'react';
import './AdminDashboard.css';

function AdminDashboard() {
  return (
    <div className="admin-dashboard" style={{ padding: '24px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0, color: '#6173D8' }}>Admin Dashboard</h1>
        <nav style={{ display: 'flex', gap: 12 }}>
          <button className="primary-btn">Overview</button>
          <button className="primary-btn">Scenarios</button>
          <button className="primary-btn">Analytics</button>
          <button className="primary-btn">Settings</button>
        </nav>
      </header>
      <main style={{ marginTop: 24 }}>
        <section style={{ marginBottom: 16 }}>
          <h2>Overview</h2>
          <p>Welcome, Admin. This is the real dashboard page.</p>
        </section>
        <section>
          <h2>Recent Activity</h2>
          <ul>
            <li>Datasets updated</li>
            <li>Simulation run completed</li>
            <li>Alerts: none</li>
          </ul>
        </section>
      </main>
    </div>
  );
}

export default AdminDashboard;

