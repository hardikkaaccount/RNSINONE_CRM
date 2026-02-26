import { useState, useEffect } from 'react';
import { LayoutDashboard, Users, CalendarCheck, ShieldAlert, CheckCircle, Ban, Target, Activity } from 'lucide-react';
import './index.css';

const API_BASE = 'http://localhost:3000/api';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState<any>(null);
  const [leads, setLeads] = useState<any[]>([]);
  const [followups, setFollowups] = useState<any[]>([]);
  const [blocked, setBlocked] = useState<string[]>([]);

  const fetchData = async () => {
    try {
      const [_stats, _leads, _followups, _blocked] = await Promise.all([
        fetch(`${API_BASE}/stats`).then(res => res.json()),
        fetch(`${API_BASE}/leads`).then(res => res.json()),
        fetch(`${API_BASE}/followups`).then(res => res.json()),
        fetch(`${API_BASE}/blocked`).then(res => res.json())
      ]);
      setStats(_stats);
      setLeads(_leads.reverse());
      setFollowups(Object.values(_followups).filter((f: any) => !['stopped', 'confirmed'].includes(f.status)));
      setBlocked(_blocked);
    } catch (err) {
      console.error("Failed to fetch API data. Make sure backend is running on 3000.", err);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleStatusChange = async (phone: string, status: string) => {
    try {
      await fetch(`${API_BASE}/updateStatus`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, status })
      });
      fetchData();
    } catch(err) { console.error(err); }
  };

  const handleUnblock = async (phone: string) => {
    if (!window.confirm(`Unblock +${phone}?`)) return;
    try {
      await fetch(`${API_BASE}/unblock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone })
      });
      fetchData();
    } catch(err) { console.error(err); }
  };

  return (
    <div className="dashboard-container">
      {/* Sidebar Navigation */}
      <div className="sidebar">
        <div className="brand">
          <Activity color="#3b82f6" /> MotoBot CRM
        </div>
        <div className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
          <LayoutDashboard size={20} /> Dashboard
        </div>
        <div className={`nav-item ${activeTab === 'leads' ? 'active' : ''}`} onClick={() => setActiveTab('leads')}>
          <Users size={20} /> All Leads
        </div>
        <div className={`nav-item ${activeTab === 'followups' ? 'active' : ''}`} onClick={() => setActiveTab('followups')}>
          <CalendarCheck size={20} /> Active Follow-ups
        </div>
        <div className={`nav-item ${activeTab === 'spam' ? 'active' : ''}`} onClick={() => setActiveTab('spam')}>
          <ShieldAlert size={20} /> Spam Control {blocked.length > 0 && <span style={{backgroundColor: '#ef4444', color: 'white', padding: '2px 6px', borderRadius: '10px', fontSize: '10px'}}>{blocked.length}</span>}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="main-content">
        <div className="header">
          <h1>{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</h1>
          <div className="pulse-indicator">
            <span className="pulse-dot"></span> Live Sync Enabled
          </div>
        </div>

        {activeTab === 'dashboard' && stats && (
          <>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-header"><Target size={16}/> Total Leads</div>
                <p className="stat-value">{stats.totalLeads}</p>
              </div>
              <div className="stat-card">
                <div className="stat-header"><CalendarCheck size={16}/> Active Follow-ups</div>
                <p className="stat-value" style={{color: '#3b82f6'}}>{stats.followUpStats.active}</p>
              </div>
              <div className="stat-card">
                <div className="stat-header"><CheckCircle size={16}/> Successful Closes</div>
                <p className="stat-value" style={{color: '#10b981'}}>{stats.followUpStats.stopped + stats.followUpStats.confirmed}</p>
              </div>
              <div className="stat-card" style={{ borderColor: stats.blockedCount > 0 ? 'rgba(239, 68, 68, 0.4)' : '' }}>
                <div className="stat-header" style={{ color: stats.blockedCount > 0 ? '#ef4444' : '' }}><Ban size={16}/> Blocked Spam</div>
                <p className="stat-value" style={{color: stats.blockedCount > 0 ? '#ef4444' : ''}}>{stats.blockedCount}</p>
              </div>
            </div>

            <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem', marginTop: '2rem' }}>Recent Activity</h2>
            <div className="table-container">
              <table>
                <thead><tr><th>Date</th><th>Customer</th><th>Vehicle</th><th>Priority</th><th>Action</th></tr></thead>
                <tbody>
                  {leads.slice(0, 5).map((lead, i) => (
                    <tr key={i}>
                      <td style={{ color: 'var(--text-muted)' }}>{new Date(lead.lastUpdated || lead.createdAt).toLocaleDateString()}</td>
                      <td><div>{lead.name}</div><div style={{fontSize: '0.75rem', color: 'var(--text-muted)'}}>{lead.phone}</div></td>
                      <td>{lead.vehicle} {lead.model}</td>
                      <td><span className={`badge ${lead.priority}`}>{lead.priority}</span></td>
                      <td>
                        <select 
                          className="status-dropdown" 
                          value={lead.status?.replace('_SYNCED', '') || 'PENDING'} 
                          onChange={(e) => handleStatusChange(lead.phone, e.target.value)}
                        >
                          <option value="PENDING">PENDING</option>
                          <option value="CLEAR">CLEAR</option>
                          <option value="REJECTED">REJECTED</option>
                          <option value="CLEAR_STATUS">CLEAR_STATUS</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {activeTab === 'leads' && (
          <div className="table-container">
            <table>
              <thead><tr><th>Date</th><th>Customer</th><th>Vehicle / Loc</th><th>Priority</th><th>Enquiry Details</th><th>Action</th></tr></thead>
              <tbody>
                {leads.map((lead, i) => (
                  <tr key={i}>
                    <td style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{new Date(lead.lastUpdated || lead.createdAt).toLocaleDateString()}</td>
                    <td><div style={{fontWeight: 500}}>{lead.name}</div><div style={{fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-muted)'}}>{lead.phone}</div></td>
                    <td><div>{lead.vehicle} {lead.model}</div><div style={{fontSize: '0.75rem', color: 'var(--text-muted)'}}>{lead.location}</div></td>
                    <td><span className={`badge ${lead.priority}`}>{lead.priority}</span></td>
                    <td style={{ maxWidth: '300px' }}>{lead.enquiryDetails}</td>
                    <td>
                        <select 
                          className="status-dropdown" 
                          value={lead.status?.replace('_SYNCED', '') || 'PENDING'} 
                          onChange={(e) => handleStatusChange(lead.phone, e.target.value)}
                        >
                          <option value="PENDING">PENDING</option>
                          <option value="CLEAR">CLEAR</option>
                          <option value="REJECTED">REJECTED</option>
                          <option value="CLEAR_STATUS">CLEAR_STATUS</option>
                        </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'followups' && (
          <div className="table-container">
            <table>
              <thead><tr><th>Customer</th><th>Vehicle</th><th>Status</th><th>Reminders Sent</th><th>Next Scheduled</th><th>Action</th></tr></thead>
              <tbody>
                {followups.length === 0 ? (
                  <tr><td colSpan={6} className="empty-state">No automated follow-ups running.</td></tr>
                ) : followups.sort((a,b)=> new Date(a.nextFollowUpAt).getTime() - new Date(b.nextFollowUpAt).getTime()).map((f, i) => (
                  <tr key={i}>
                    <td><div style={{fontWeight: 500}}>{f.name}</div><div style={{fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-muted)'}}>{f.phone}</div></td>
                    <td>{f.vehicle} {f.model}</td>
                    <td><span className={`badge status-${f.status}`}>{f.status}</span></td>
                    <td>{f.remindersSent} / {f.maxReminders}</td>
                    <td style={{ color: new Date(f.nextFollowUpAt) < new Date() ? '#ef4444' : '' }}>
                      {new Date(f.nextFollowUpAt).toLocaleString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'})}
                    </td>
                    <td>
                      <button className="btn btn-danger" onClick={() => handleStatusChange(f.phone, 'CLEAR')}>Stop Sequence</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'spam' && (
          <div className="table-container">
            <table>
              <thead><tr><th>Blocked Phone Number</th><th>Action</th></tr></thead>
              <tbody>
                {blocked.length === 0 ? (
                  <tr><td colSpan={2} className="empty-state">No phone numbers are currently blocked.</td></tr>
                ) : blocked.map((phone, i) => (
                  <tr key={i}>
                    <td style={{fontFamily: 'monospace', fontSize: '1rem'}}>+{phone}</td>
                    <td><button className="btn btn-success" onClick={() => handleUnblock(phone)}>Unblock User</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </div>
  );
}

export default App;
