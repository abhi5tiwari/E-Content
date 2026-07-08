// Admin: User Account Management Logic

// 1. Render Users Workspace
async function renderUsersPanel() {
  const container = document.getElementById('active-panel-body');

  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
      <h2 style="font-weight: 800;">User Account Management</h2>
      <button class="glass-btn" onclick="openUserModal()">
        <svg style="width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 2;" viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>
        Register New Account
      </button>
    </div>

    <div class="glass-card panel-section fade-in">
      <div class="glass-table-container">
        <table class="glass-table">
          <thead>
            <tr>
              <th>Full Name</th>
              <th>Username</th>
              <th>Email</th>
              <th>Role</th>
              <th>Registered</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="admin-users-list-tbody">
            <tr><td colspan="6" style="text-align: center; color: var(--text-light)">Loading users list...</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  `;

  await fetchAndRenderUsers();
}

async function fetchAndRenderUsers() {
  const tbody = document.getElementById('admin-users-list-tbody');
  const res = await API.get('/api/users');

  if (!res.success || !res.users) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-danger)">Error loading users.</td></tr>';
    return;
  }

  tbody.innerHTML = '';
  res.users.forEach(u => {
    // Formatting role badges
    let roleBadge = '';
    if (u.role === 'admin') roleBadge = '<span class="badge bg-danger-subtle">Admin</span>';
    else if (u.role === 'librarian') roleBadge = '<span class="badge bg-warning-subtle">Librarian</span>';
    else roleBadge = '<span class="badge bg-info-subtle">Student</span>';

    const regDateStr = new Date(u.created_at).toLocaleDateString();

    tbody.innerHTML += `
      <tr>
        <td><b>${escapeHtml(u.full_name)}</b></td>
        <td>${escapeHtml(u.username)}</td>
        <td>${escapeHtml(u.email)}</td>
        <td>${roleBadge}</td>
        <td>${regDateStr}</td>
        <td>
          <div style="display: flex; gap: 8px;">
            <button class="glass-btn glass-btn-secondary" style="padding: 6px 12px; font-size: 0.8rem; box-shadow: none;" onclick="openUserModal(${JSON.stringify(u).replace(/"/g, '&quot;')})">
              Edit
            </button>
            <button class="glass-btn glass-btn-danger" style="padding: 6px 12px; font-size: 0.8rem; box-shadow: none; ${u.id === currentUser.id ? 'opacity:0.4; cursor:not-allowed;' : ''}" onclick="${u.id !== currentUser.id ? `deleteUser(${u.id})` : ''}" ${u.id === currentUser.id ? 'disabled' : ''}>
              Delete
            </button>
          </div>
        </td>
      </tr>
    `;
  });
}

// Open modal to Create or Edit User Account
function openUserModal(user = null) {
  const isEdit = user !== null;
  const title = isEdit ? 'Modify Account Details' : 'Register New Account';

  const formHtml = `
    <form id="user-manager-form" onsubmit="submitUserForm(event, ${isEdit ? user.id : 'null'})">
      <div class="form-group">
        <label for="usr-fullname">Full Name</label>
        <input type="text" id="usr-fullname" class="glass-input" value="${isEdit ? escapeHtml(user.full_name) : ''}" placeholder="Rahul Sharma" required>
      </div>
      <div class="form-group">
        <label for="usr-email">Email Address</label>
        <input type="email" id="usr-email" class="glass-input" value="${isEdit ? escapeHtml(user.email) : ''}" placeholder="rahul@example.com" required>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label for="usr-username">Username</label>
          <input type="text" id="usr-username" class="glass-input" value="${isEdit ? escapeHtml(user.username) : ''}" placeholder="rahul123" ${isEdit ? 'disabled style="opacity:0.5;"' : 'required'}>
        </div>
        <div class="form-group">
          <label for="usr-role">Account Privilege</label>
          <select id="usr-role" class="glass-input" style="cursor: pointer;">
            <option value="student" ${isEdit && user.role === 'student' ? 'selected' : ''}>Student Account</option>
            <option value="librarian" ${isEdit && user.role === 'librarian' ? 'selected' : ''}>Librarian Account</option>
            <option value="admin" ${isEdit && user.role === 'admin' ? 'selected' : ''}>Administrator</option>
          </select>
        </div>
      </div>
      <div class="form-group">
        <label for="usr-password">Password</label>
        <input type="password" id="usr-password" class="glass-input" placeholder="${isEdit ? 'Leave blank to keep current password' : 'Enter account password'}" ${isEdit ? '' : 'required'}>
      </div>

      <div style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 24px; border-top: 1px solid var(--border-color); padding-top: 16px;">
        <button type="button" class="glass-btn glass-btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="submit" class="glass-btn">${isEdit ? 'Save Changes' : 'Register Account'}</button>
      </div>
    </form>
  `;

  showModal(title, formHtml);
}

// Create/Update User Account Submit
async function submitUserForm(e, userId) {
  e.preventDefault();

  const payload = {
    full_name: document.getElementById('usr-fullname').value,
    email: document.getElementById('usr-email').value,
    role: document.getElementById('usr-role').value,
    password: document.getElementById('usr-password').value
  };

  // If registering, also send username
  if (!userId) {
    payload.username = document.getElementById('usr-username').value;
  }

  let res;
  if (userId) {
    res = await API.put(`/api/users/${userId}`, payload);
  } else {
    res = await API.post('/api/users', payload);
  }

  if (res.success) {
    alert(res.message || 'User account successfully saved.');
    closeModal();
    fetchAndRenderUsers();
  } else {
    alert(res.message || 'Error processing request.');
  }
}

// Delete User Account
async function deleteUser(userId) {
  if (confirm('Are you sure you want to delete this user account permanently? All test attempts will be wiped.')) {
    const res = await API.delete(`/api/users/${userId}`);
    if (res.success) {
      alert(res.message || 'Account deleted successfully.');
      fetchAndRenderUsers();
    } else {
      alert(res.message || 'Error deleting account.');
    }
  }
}
