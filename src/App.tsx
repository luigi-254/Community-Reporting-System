import './App.css'

function App() {
  return (
    <div className="dashboard">
      <aside className="sidebar">
        <h2>Community Reports</h2>

        <nav>
          <a href="#" className="active">
            Dashboard
          </a>
          <a href="#">Reports</a>
          <a href="#">Users</a>
          <a href="#">Statistics</a>
          <a href="#">Settings</a>
        </nav>

        <button className="logout">Logout</button>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <h1>Admin Dashboard</h1>
            <p>Manage and monitor community reports</p>
          </div>

          <div className="admin-profile">
            <span className="profile-circle">AD</span>
            <span>Administrator</span>
          </div>
        </header>

        <section className="stats">
          <div className="stat-card">
            <h3>Total Reports</h3>
            <strong>120</strong>
          </div>

          <div className="stat-card">
            <h3>Pending</h3>
            <strong>35</strong>
          </div>

          <div className="stat-card">
            <h3>In Progress</h3>
            <strong>45</strong>
          </div>

          <div className="stat-card">
            <h3>Resolved</h3>
            <strong>40</strong>
          </div>
        </section>

        <section className="reports-section">
          <div className="section-header">
            <h2>Recent Reports</h2>
            <button>View All</button>
          </div>

          <div className="reports-table">
            <div className="table-header">
              <span>Issue</span>
              <span>Location</span>
              <span>Status</span>
              <span>Date</span>
            </div>

            <div className="table-row">
              <span>Pothole</span>
              <span>Kisii Town</span>
              <span className="status pending">Pending</span>
              <span>06 Oct 2026</span>
            </div>

            <div className="table-row">
              <span>Blocked Drainage</span>
              <span>Nyamira</span>
              <span className="status progress">In Progress</span>
              <span>05 Oct 2026</span>
            </div>

            <div className="table-row">
              <span>Broken Streetlight</span>
              <span>Keroka</span>
              <span className="status resolved">Resolved</span>
              <span>04 Oct 2026</span>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

export default App