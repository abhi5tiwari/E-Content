let activeCharts = {};

// Main Dashboard entry point
function renderDashboardOverview() {
  const container = document.getElementById('active-panel-body');
  const role = currentUser.role;

  // 1. Generate HTML framework depending on role
  let html = '';

  if (role === 'admin' || role === 'librarian') {
    html = `
      <!-- Stats Counters Grid -->
      <div class="stats-grid" id="stats-container-cards" style="margin-bottom: 24px;"></div>
      
      <!-- Expanded Charts Section -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px;" class="fade-in">
        <div class="glass-card panel-section">
          <div class="panel-title">Mock Exams Popularity</div>
          <div class="chart-container"><canvas id="examPopularityChart"></canvas></div>
        </div>
        <div class="glass-card panel-section">
          <div class="panel-title">Most Downloaded Notes</div>
          <div class="chart-container"><canvas id="downloadedNotesChart"></canvas></div>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1.5fr; gap: 24px; margin-bottom: 24px;" class="fade-in">
        <div class="glass-card panel-section">
          <div class="panel-title">Top Library Categories</div>
          <div class="chart-container"><canvas id="topSubjectsChart"></canvas></div>
        </div>
        <div class="glass-card panel-section">
          <div class="panel-title">Monthly Activity: Downloads vs Borrowing</div>
          <div class="chart-container"><canvas id="monthlyActivityChart"></canvas></div>
        </div>
      </div>

      <div class="dashboard-split-grid fade-in">
        <!-- System Activity Log Timeline -->
        <div class="glass-card panel-section">
          <div class="panel-title">System Activity Timeline</div>
          <div class="activity-timeline-container" style="max-height: 320px; overflow-y: auto; padding-right: 8px;">
            <div id="activity-timeline-list" style="display: flex; flex-direction: column; gap: 12px;">
              <div style="color: var(--text-light); text-align: center;">Loading activity log...</div>
            </div>
          </div>
        </div>

        <!-- Export Center Panel -->
        <div class="glass-card panel-section">
          <div class="panel-title">Reports & Data Export Center</div>
          <p style="font-size: 0.85rem; color: var(--text-light); margin-bottom: 20px;">Download comma-separated values (CSV) matching active portal databases.</p>
          
          <form id="export-report-form" onsubmit="triggerCsvExport(event)">
            <div class="form-group">
              <label for="export-report-type">Choose Database Report</label>
              <select id="export-report-type" class="glass-input" style="cursor: pointer; padding: 10px;">
                <option value="exams">Competitive Exam Registry Profiles</option>
                <option value="notes">Digital Study Material Notes List</option>
                <option value="downloads">Material Downloads History Logs</option>
                <option value="borrows">Library Books Circulation Logs</option>
                <option value="doubts">Discussion Doubts and Resolved Threads</option>
                <option value="logs">Recent System Activity Timeline Logs</option>
              </select>
            </div>
            
            <button type="submit" class="glass-btn" style="width: 100%; margin-top: 16px; font-weight: 700;">
              <svg style="width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 2; margin-right: 8px;" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
              <span>Export Report to CSV</span>
            </button>
          </form>
        </div>
      </div>
    `;
  } else if (role === 'student') {
    html = `
      <!-- Stats Counters Grid -->
      <div class="stats-grid" id="stats-container-cards" style="margin-bottom: 24px;"></div>
      
      <div class="dashboard-split-grid fade-in" style="margin-bottom: 24px;">
        <div class="glass-card panel-section">
          <div class="panel-title">Test Score Progression</div>
          <div class="chart-container"><canvas id="studentScoreChart"></canvas></div>
        </div>
        
        <div class="glass-card panel-section">
          <div class="panel-title">Recent Mock Test Attempts</div>
          <div class="glass-table-container" style="max-height: 250px; overflow-y: auto;">
            <table class="glass-table">
              <thead>
                <tr>
                  <th>Exam Title</th>
                  <th>Score</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody id="student-recent-exams-list">
                <tr><td colspan="3" style="text-align: center; color: var(--text-light)">Loading test results...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="dashboard-split-grid fade-in">
        <div class="glass-card panel-section">
          <div class="panel-title">My Recent Activity Logs</div>
          <div class="activity-timeline-container" style="max-height: 250px; overflow-y: auto; padding-right: 8px;">
            <div id="activity-timeline-list" style="display: flex; flex-direction: column; gap: 12px;">
              <div style="color: var(--text-light); text-align: center;">Loading activity log...</div>
            </div>
          </div>
        </div>

        <div class="glass-card panel-section">
          <div class="panel-title">My Book Borrows</div>
          <div class="glass-table-container" style="max-height: 250px; overflow-y: auto;">
            <table class="glass-table">
              <thead>
                <tr>
                  <th>Book Title</th>
                  <th>Request Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody id="student-recent-borrows-list">
                <tr><td colspan="3" style="text-align: center; color: var(--text-light)">Loading borrowed books...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  container.innerHTML = html;
  
  // 2. Populate stats cards & tables
  renderDashboardCards();

  // 3. Initialize Canvas widgets
  initDashboardCharts();
}

// Populate statistics counts, list tables, and progress labels
function renderDashboardCards() {
  const data = window.dashboardStatsData;
  if (!data) return;

  const cardContainer = document.getElementById('stats-container-cards');
  const role = currentUser.role;

  let cardsHtml = '';
  const c = data.counters || {};

  if (role === 'admin' || role === 'librarian') {
    cardsHtml = `
      <div class="glass-card stat-card">
        <div class="stat-details">
          <span class="stat-value">${c.totalExams}</span>
          <span class="stat-label">Competitive Exams</span>
        </div>
        <div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg></div>
      </div>
      <div class="glass-card stat-card">
        <div class="stat-details">
          <span class="stat-value">${c.totalNotes}</span>
          <span class="stat-label">Digital Notes</span>
        </div>
        <div class="stat-icon" style="color: var(--success);"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg></div>
      </div>
      <div class="glass-card stat-card">
        <div class="stat-details">
          <span class="stat-value">${c.totalDownloads}</span>
          <span class="stat-label">Notes Downloads</span>
        </div>
        <div class="stat-icon" style="color: var(--info);"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg></div>
      </div>
      <div class="glass-card stat-card">
        <div class="stat-details">
          <span class="stat-value">${c.activeBorrows}</span>
          <span class="stat-label">Issued Books</span>
        </div>
        <div class="stat-icon" style="color: var(--warning);"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 3.5A2.5 2.5 0 0 1 6.5 5H20v20H6.5A2.5 2.5 0 0 1 4 22.5v-19z"></path></svg></div>
      </div>
    `;
    cardContainer.innerHTML = cardsHtml;

    // Populate timeline logs
    const timelineContainer = document.getElementById('activity-timeline-list');
    timelineContainer.innerHTML = '';
    const logs = data.activityTimeline || [];
    
    if (logs.length === 0) {
      timelineContainer.innerHTML = '<div style="color: var(--text-light); text-align: center; padding: 20px;">No system activity logged</div>';
    } else {
      logs.forEach(l => {
        const timeStr = new Date(l.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const dateStr = new Date(l.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' });
        
        timelineContainer.innerHTML += `
          <div style="display: flex; align-items: flex-start; gap: 12px; border-bottom: 1px dashed var(--border-color); padding-bottom: 8px;">
            <div style="background: rgba(79, 70, 229, 0.1); color: var(--accent); font-size: 0.75rem; font-weight: 700; padding: 4px 8px; border-radius: var(--radius-sm); white-space: nowrap;">
              ${timeStr}
            </div>
            <div style="flex-grow: 1;">
              <div style="font-size: 0.85rem; font-weight: 600;">${escapeHtml(l.action)}</div>
              <div style="font-size: 0.75rem; color: var(--text-light);">${escapeHtml(l.full_name)} (${l.role}) &bull; ${dateStr}</div>
            </div>
          </div>
        `;
      });
    }

  } else if (role === 'student') {
    cardsHtml = `
      <div class="glass-card stat-card">
        <div class="stat-details">
          <span class="stat-value">${c.examsAttempted}</span>
          <span class="stat-label">Mock Tests</span>
        </div>
        <div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg></div>
      </div>
      <div class="glass-card stat-card">
        <div class="stat-details">
          <span class="stat-value" style="color: var(--success);">${c.averagePercentage}%</span>
          <span class="stat-label">Average Mark</span>
        </div>
        <div class="stat-icon" style="color: var(--success);"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg></div>
      </div>
      <div class="glass-card stat-card">
        <div class="stat-details">
          <span class="stat-value">${c.borrowedBooks}</span>
          <span class="stat-label">Borrowed Books</span>
        </div>
        <div class="stat-icon" style="color: var(--info);"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 3.5A2.5 2.5 0 0 1 6.5 5H20v20H6.5A2.5 2.5 0 0 1 4 22.5v-19z"></path></svg></div>
      </div>
      <div class="glass-card stat-card">
        <div class="stat-details">
          <span class="stat-value">${c.pendingRequests}</span>
          <span class="stat-label">Requests Pending</span>
        </div>
        <div class="stat-icon" style="color: var(--warning);"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg></div>
      </div>
    `;
    cardContainer.innerHTML = cardsHtml;

    // Load recent mock exams list
    const tbodyExams = document.getElementById('student-recent-exams-list');
    tbodyExams.innerHTML = '';
    const exams = (data.recentActivity && data.recentActivity.exams) || [];
    if (exams.length === 0) {
      tbodyExams.innerHTML = '<tr><td colspan="3" style="text-align: center; color: var(--text-light)">No mock tests taken yet.</td></tr>';
    } else {
      exams.forEach(ea => {
        tbodyExams.innerHTML += `
          <tr>
            <td><b>${escapeHtml(ea.exam_title)}</b></td>
            <td><span style="font-weight: 700; color: var(--accent);">${ea.score}/${ea.total_marks}</span></td>
            <td>${new Date(ea.attempt_date).toLocaleDateString()}</td>
          </tr>
        `;
      });
    }

    // Load borrows list
    const tbodyBorrows = document.getElementById('student-recent-borrows-list');
    tbodyBorrows.innerHTML = '';
    const borrows = (data.recentActivity && data.recentActivity.borrows) || [];
    if (borrows.length === 0) {
      tbodyBorrows.innerHTML = '<tr><td colspan="3" style="text-align: center; color: var(--text-light)">No borrowing records</td></tr>';
    } else {
      borrows.forEach(b => {
        let stateBadge = '';
        if (b.status === 'requested') stateBadge = '<span class="badge bg-warning-subtle">requested</span>';
        else if (b.status === 'approved') stateBadge = '<span class="badge bg-info-subtle">issued</span>';
        else if (b.status === 'returned') stateBadge = '<span class="badge bg-success-subtle">returned</span>';
        
        tbodyBorrows.innerHTML += `
          <tr>
            <td style="max-width: 140px; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;"><b>${escapeHtml(b.book_title)}</b></td>
            <td>${new Date(b.request_date).toLocaleDateString()}</td>
            <td>${stateBadge}</td>
          </tr>
        `;
      });
    }

    // Filter logs for this student
    const timelineContainer = document.getElementById('activity-timeline-list');
    timelineContainer.innerHTML = '';
    
    // Filter the timeline to current user's logs
    const logs = (data.activityTimeline || []).filter(l => l.user_id === currentUser.id);
    if (logs.length === 0) {
      timelineContainer.innerHTML = '<div style="color: var(--text-light); text-align: center; padding: 20px;">No recent logs</div>';
    } else {
      logs.forEach(l => {
        const timeStr = new Date(l.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const dateStr = new Date(l.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' });
        timelineContainer.innerHTML += `
          <div style="display: flex; align-items: flex-start; gap: 12px; border-bottom: 1px dashed var(--border-color); padding-bottom: 8px;">
            <div style="background: rgba(16, 185, 129, 0.1); color: var(--success); font-size: 0.75rem; font-weight: 700; padding: 4px 8px; border-radius: var(--radius-sm); white-space: nowrap;">
              ${timeStr}
            </div>
            <div style="flex-grow: 1;">
              <div style="font-size: 0.85rem; font-weight: 600;">${escapeHtml(l.action)}</div>
              <div style="font-size: 0.75rem; color: var(--text-light);">${dateStr}</div>
            </div>
          </div>
        `;
      });
    }
  }
}

// Chart Constructor mappings
function initDashboardCharts() {
  const data = window.dashboardStatsData;
  if (!data) return;

  const role = currentUser.role;
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const textColor = isDark ? '#94a3b8' : '#64748b';
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';

  // Destroy previous instances to avoid rendering overlap glitches
  Object.keys(activeCharts).forEach(key => {
    if (activeCharts[key]) activeCharts[key].destroy();
  });
  activeCharts = {};

  if (role === 'admin' || role === 'librarian') {
    // 1. Exam Popularity Chart (Horizontal Bar)
    const ctxPop = document.getElementById('examPopularityChart');
    if (ctxPop) {
      const popData = data.charts.examPopularity || [];
      const labels = popData.map(p => p.label.substring(0, 16) + '...');
      const counts = popData.map(p => p.count);

      activeCharts.popularity = new Chart(ctxPop, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [{
            label: 'Attempts',
            data: counts,
            backgroundColor: 'rgba(79, 70, 229, 0.65)',
            borderColor: '#4f46e5',
            borderWidth: 1,
            borderRadius: 4
          }]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { color: gridColor }, ticks: { color: textColor, font: { family: 'Outfit' }, precision: 0 } },
            y: { grid: { display: false }, ticks: { color: textColor, font: { family: 'Outfit' } } }
          }
        }
      });
    }

    // 2. Downloaded Notes Chart (Vertical Bar)
    const ctxNotes = document.getElementById('downloadedNotesChart');
    if (ctxNotes) {
      const notesData = data.charts.mostDownloadedNotes || [];
      const labels = notesData.map(n => n.label.substring(0, 16) + '...');
      const counts = notesData.map(n => n.count);

      activeCharts.notes = new Chart(ctxNotes, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [{
            label: 'Downloads',
            data: counts,
            backgroundColor: 'rgba(16, 185, 129, 0.65)',
            borderColor: '#10b981',
            borderWidth: 1,
            borderRadius: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { display: false }, ticks: { color: textColor, font: { family: 'Outfit' } } },
            y: { grid: { color: gridColor }, ticks: { color: textColor, font: { family: 'Outfit' }, precision: 0 } }
          }
        }
      });
    }

    // 3. Top Subjects Doughnut
    const ctxSub = document.getElementById('topSubjectsChart');
    if (ctxSub) {
      const subData = data.charts.topSubjects || [];
      const labels = subData.map(s => s.label);
      const counts = subData.map(s => s.count);

      activeCharts.subjects = new Chart(ctxSub, {
        type: 'doughnut',
        data: {
          labels: labels,
          datasets: [{
            data: counts,
            backgroundColor: ['#4f46e5', '#10b981', '#3b82f6', '#f59e0b', '#ec4899'],
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: { color: textColor, font: { family: 'Outfit', size: 11 } }
            }
          }
        }
      });
    }

    // 4. Monthly Activity Double Line
    const ctxMonth = document.getElementById('monthlyActivityChart');
    if (ctxMonth) {
      const monthData = data.charts.monthlyActivity || {};
      const borrowsList = monthData.borrows || [];
      const downloadsList = monthData.downloads || [];

      // Merge months labels
      const allMonths = [...new Set([...borrowsList.map(b => b.month), ...downloadsList.map(d => d.month)])].sort();
      
      const borrowsPlot = allMonths.map(m => {
        const found = borrowsList.find(b => b.month === m);
        return found ? found.count : 0;
      });

      const downloadsPlot = allMonths.map(m => {
        const found = downloadsList.find(d => d.month === m);
        return found ? found.count : 0;
      });

      activeCharts.monthly = new Chart(ctxMonth, {
        type: 'line',
        data: {
          labels: allMonths,
          datasets: [
            {
              label: 'Book Loans',
              data: borrowsPlot,
              borderColor: '#f59e0b',
              backgroundColor: 'rgba(245, 158, 11, 0.05)',
              tension: 0.3,
              fill: true,
              borderWidth: 2
            },
            {
              label: 'Notes Downloads',
              data: downloadsPlot,
              borderColor: '#3b82f6',
              backgroundColor: 'rgba(59, 130, 246, 0.05)',
              tension: 0.3,
              fill: true,
              borderWidth: 2
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'top',
              labels: { color: textColor, font: { family: 'Outfit' } }
            }
          },
          scales: {
            x: { grid: { color: gridColor }, ticks: { color: textColor, font: { family: 'Outfit' } } },
            y: { grid: { color: gridColor }, ticks: { color: textColor, font: { family: 'Outfit' }, precision: 0 } }
          }
        }
      });
    }

  } else if (role === 'student') {
    const scoresData = data.charts.scores || [];
    const ctxScore = document.getElementById('studentScoreChart');
    if (ctxScore) {
      const labels = scoresData.map((s, idx) => `Quiz ${idx + 1}`);
      const percentages = scoresData.map(s => Math.round(s.score_percent));

      activeCharts.studentScore = new Chart(ctxScore, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [{
            label: 'Score Percentage',
            data: percentages,
            borderColor: '#4f46e5',
            backgroundColor: 'rgba(79, 70, 229, 0.08)',
            fill: true,
            tension: 0.4,
            borderWidth: 3,
            pointRadius: 6,
            pointBackgroundColor: '#4f46e5'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { color: gridColor }, ticks: { color: textColor, font: { family: 'Outfit' } } },
            y: { 
              grid: { color: gridColor }, 
              ticks: { color: textColor, font: { family: 'Outfit' } },
              min: 0,
              max: 100
            }
          }
        }
      });
    }
  }
}

// Redraw grids and labels when styling toggles
function updateChartsTheme() {
  setTimeout(() => {
    initDashboardCharts();
  }, 100);
}
