let currentUser = null;
let currentPanel = 'dashboard';

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Route guard check
  const token = localStorage.getItem('token');
  const userJson = localStorage.getItem('user');

  if (!token || !userJson) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
    return;
  }

  currentUser = JSON.parse(userJson);

  // Set Profile info in sidebar
  document.getElementById('user-display-name').textContent = currentUser.full_name;
  document.getElementById('user-display-role').querySelector('span').textContent = currentUser.role;
  
  // Set avatar initials
  const nameParts = currentUser.full_name.split(' ');
  const initials = nameParts.map(p => p[0]).slice(0, 2).join('').toUpperCase();
  document.getElementById('user-avatar-initials').textContent = initials || 'U';

  // Set current date
  const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  document.getElementById('current-system-date').textContent = new Date().toLocaleDateString(undefined, dateOptions);

  // Initialize theme
  initDashboardTheme();

  // 2. Generate Menu based on role
  buildSidebarMenu();

  // 3. Load active panel (default dashboard)
  loadPanel(currentPanel);

  // 4. Poll statistics and notifications on load
  await refreshDashboardStats();
  
  // Refresh notifications every 60 seconds
  setInterval(refreshDashboardStats, 60000);
});

// Build dynamic navigation sidebar menu matching user roles
function buildSidebarMenu() {
  const menuList = document.getElementById('role-menu-list');
  menuList.innerHTML = ''; // clear spinner

  const menuItems = {
    admin: [
      { id: 'dashboard', label: 'Admin Dashboard', icon: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="9"></rect><rect x="14" y="3" width="7" height="5"></rect><rect x="14" y="12" width="7" height="9"></rect><rect x="3" y="16" width="7" height="5"></rect></svg>' },
      { id: 'users', label: 'User Manager', icon: '<svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>' },
      { id: 'exams', label: 'Exam Creator', icon: '<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>' },
      { id: 'comp_exams', label: 'Competitive Exams', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>' },
      { id: 'notes', label: 'Study Materials', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>' },
      { id: 'forum', label: 'Discussion Forum', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>' },
      { id: 'library', label: 'Library Catalog', icon: '<svg viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 3.5A2.5 2.5 0 0 1 6.5 5H20v20H6.5A2.5 2.5 0 0 1 4 22.5v-19z"></path></svg>' },
      { id: 'circulation', label: 'Circulation Logs', icon: '<svg viewBox="0 0 24 24"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>' }
    ],
    librarian: [
      { id: 'dashboard', label: 'Library Overview', icon: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="9"></rect><rect x="14" y="3" width="7" height="5"></rect><rect x="14" y="12" width="7" height="9"></rect><rect x="3" y="16" width="7" height="5"></rect></svg>' },
      { id: 'comp_exams', label: 'Competitive Exams', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>' },
      { id: 'notes', label: 'Study Materials', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>' },
      { id: 'forum', label: 'Discussion Forum', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>' },
      { id: 'library', label: 'Book Catalog', icon: '<svg viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 3.5A2.5 2.5 0 0 1 6.5 5H20v20H6.5A2.5 2.5 0 0 1 4 22.5v-19z"></path></svg>' },
      { id: 'circulation', label: 'Issue & Returns', icon: '<svg viewBox="0 0 24 24"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>' }
    ],
    student: [
      { id: 'dashboard', label: 'My Hub', icon: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="9"></rect><rect x="14" y="3" width="7" height="5"></rect><rect x="14" y="12" width="7" height="9"></rect><rect x="3" y="16" width="7" height="5"></rect></svg>' },
      { id: 'exams', label: 'Exam Center', icon: '<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>' },
      { id: 'comp_exams', label: 'Competitive Exams', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>' },
      { id: 'syllabus', label: 'Syllabus Tracker', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>' },
      { id: 'notes', label: 'Study Materials', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>' },
      { id: 'forum', label: 'Discussion Forum', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>' },
      { id: 'library', label: 'Library Catalog', icon: '<svg viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 3.5A2.5 2.5 0 0 1 6.5 5H20v20H6.5A2.5 2.5 0 0 1 4 22.5v-19z"></path></svg>' },
      { id: 'borrows', label: 'My Book Borrows', icon: '<svg viewBox="0 0 24 24"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>' }
    ]
  };

  const list = menuItems[currentUser.role] || [];
  list.forEach(item => {
    const div = document.createElement('div');
    div.className = `menu-item ${item.id === currentPanel ? 'active' : ''}`;
    div.id = `sidebar-menu-${item.id}`;
    div.innerHTML = `${item.icon}<span>${item.label}</span>`;
    div.addEventListener('click', () => selectMenuPanel(item.id));
    menuList.appendChild(div);
  });
}

// Menu Selection triggers SPA panel updates
function selectMenuPanel(panelId) {
  // Update active class in sidebar
  document.querySelectorAll('.menu-item').forEach(el => el.classList.remove('active'));
  const activeEl = document.getElementById(`sidebar-menu-${panelId}`);
  if (activeEl) activeEl.classList.add('active');

  currentPanel = panelId;
  loadPanel(panelId);

  // Close mobile sidebar if open
  const sidebar = document.getElementById('dashboard-sidebar');
  if (sidebar.classList.contains('active')) {
    sidebar.classList.remove('active');
  }
}

// Router logic: load and render HTML modules in main content frame
function loadPanel(panelId) {
  const container = document.getElementById('active-panel-body');
  
  // Set spinner
  container.innerHTML = `
    <div class="flex-center" style="flex-grow: 1; flex-direction: column; gap: 16px;">
      <div class="spinner"></div>
      <p style="color: var(--text-secondary);">Loading view panel...</p>
    </div>
  `;

  // Routing
  if (panelId === 'dashboard') {
    renderDashboardOverview();
  } else if (panelId === 'users') {
    renderUsersPanel();
  } else if (panelId === 'exams') {
    renderExamsPanel();
  } else if (panelId === 'comp_exams') {
    renderCompetitiveExamsPanel();
  } else if (panelId === 'syllabus') {
    renderSyllabusPanel();
  } else if (panelId === 'notes') {
    renderStudyMaterialsPanel();
  } else if (panelId === 'forum') {
    renderDoubtForumPanel();
  } else if (panelId === 'library') {
    renderLibraryCatalogPanel();
  } else if (panelId === 'borrows' || panelId === 'circulation') {
    renderCirculationPanel();
  }
}

// Modal opening utility
function showModal(title, htmlContent) {
  const overlay = document.getElementById('common-modal-overlay');
  const container = document.getElementById('modal-content-container');

  container.innerHTML = `
    <div class="modal-header">
      <h3>${title}</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <div class="modal-body-content">
      ${htmlContent}
    </div>
  `;

  overlay.classList.add('active');
}

function closeModal() {
  document.getElementById('common-modal-overlay').classList.remove('active');
}

// Handle responsive layout toggle
function toggleSidebarMobile() {
  const sidebar = document.getElementById('dashboard-sidebar');
  sidebar.classList.toggle('active');
}

// Notifications tray dropdown toggle
function toggleNotificationsPanel() {
  const tray = document.getElementById('notifications-tray');
  tray.classList.toggle('active');
}

// Click outside close helpers
document.addEventListener('click', (e) => {
  const tray = document.getElementById('notifications-tray');
  const btn = document.getElementById('notif-toggle-btn');
  if (tray && tray.classList.contains('active') && !tray.contains(e.target) && !btn.contains(e.target)) {
    tray.classList.remove('active');
  }
});

// Notifications fetcher and clear functions
async function refreshDashboardStats() {
  const res = await API.get('/api/dashboard/stats');
  if (res.success) {
    // Save data for subpanel scripts to query locally
    window.dashboardStatsData = res.stats;
    
    // Update dashboard visual greeting
    document.getElementById('header-greeting').textContent = `Hello, ${currentUser.full_name}!`;

    // Process notification tray count
    const list = res.notifications || [];
    const container = document.getElementById('notifications-container-list');
    const badge = document.getElementById('unread-notif-dot');
    
    container.innerHTML = '';
    let unreadCount = 0;

    if (list.length === 0) {
      container.innerHTML = '<div class="notif-empty">No new notifications</div>';
      badge.classList.add('hidden');
      return;
    }

    list.forEach(n => {
      if (n.is_read === 0) unreadCount++;
      const div = document.createElement('div');
      div.className = `notif-item ${n.is_read === 0 ? 'unread' : ''}`;
      div.innerHTML = `
        <div>${escapeHtml(n.message)}</div>
        <div class="notif-time">${new Date(n.created_at).toLocaleString()}</div>
      `;
      container.appendChild(div);
    });

    if (unreadCount > 0) {
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }

    // If currently looking at dashboard overview, refresh the UI elements without full page blink
    if (currentPanel === 'dashboard' && typeof renderDashboardCards === 'function') {
      renderDashboardCards();
    }
  }
}

async function markAllNotificationsAsRead() {
  const res = await API.post('/api/notifications/read', {});
  if (res.success) {
    document.getElementById('unread-notif-dot').classList.add('hidden');
    await refreshDashboardStats();
  }
}

// Light & Dark theme controls inside Dashboard
function initDashboardTheme() {
  const themeToggle = document.getElementById('dashboard-theme-toggle');
  if (themeToggle) {
    const sunIcon = themeToggle.querySelector('#theme-sun');
    const moonIcon = themeToggle.querySelector('#theme-moon');
    
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    if (savedTheme === 'light') {
      sunIcon.style.display = 'none';
      moonIcon.style.display = 'block';
    } else {
      sunIcon.style.display = 'block';
      moonIcon.style.display = 'none';
    }

    themeToggle.onclick = () => {
      const currentTheme = document.documentElement.getAttribute('data-theme');
      let newTheme = 'dark';
      if (currentTheme === 'dark') {
        newTheme = 'light';
        sunIcon.style.display = 'none';
        moonIcon.style.display = 'block';
      } else {
        sunIcon.style.display = 'block';
        moonIcon.style.display = 'none';
      }
      document.documentElement.setAttribute('data-theme', newTheme);
      localStorage.setItem('theme', newTheme);
      
      // Notify Chart.js engines to repaint gridlines
      if (typeof updateChartsTheme === 'function') {
        updateChartsTheme();
      }
    };
  }
}

// Utility helper to secure HTML values
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
