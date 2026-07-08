// Library Catalog and Circulation Panel Handling

// 1. Render Catalog Page
async function renderLibraryCatalogPanel() {
  const container = document.getElementById('active-panel-body');
  const role = currentUser.role;

  let actionHeader = '';
  if (role === 'admin' || role === 'librarian') {
    actionHeader = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
        <h2 style="font-weight: 800;">Catalog Management</h2>
        <button class="glass-btn" onclick="openBookModal()">
          <svg style="width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 2;" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          Add Book Title
        </button>
      </div>
    `;
  } else {
    actionHeader = `
      <div style="margin-bottom: 24px;">
        <h2 style="font-weight: 800;">Library Book Catalog</h2>
        <p style="color: var(--text-secondary); font-size: 0.9rem;">Browse through scientific references, exam preparative papers, and general study guides.</p>
      </div>
    `;
  }

  container.innerHTML = `
    ${actionHeader}
    
    <!-- Controls Search / Filter -->
    <div class="catalog-controls">
      <div class="catalog-search-wrapper">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        <input type="text" id="catalog-search-input" class="glass-input catalog-search" placeholder="Search by title, author, or ISBN..." oninput="filterCatalog()">
      </div>
      <div style="min-width: 200px;">
        <select id="catalog-category-filter" class="glass-input" onchange="filterCatalog()" style="cursor: pointer;">
          <option value="">All Categories</option>
        </select>
      </div>
    </div>

    <!-- Catalog grid -->
    <div class="catalog-grid" id="catalog-books-list">
      <div class="spinner flex-center" style="margin: 40px auto; grid-column: 1/-1;"></div>
    </div>
  `;

  // Fetch initial books list
  await fetchAndRenderBooks();
}

async function fetchAndRenderBooks(search = '', category = '') {
  const booksListContainer = document.getElementById('catalog-books-list');
  const role = currentUser.role;

  let queryUrl = '/api/library/books';
  const params = [];
  if (search) params.push(`search=${encodeURIComponent(search)}`);
  if (category) params.push(`category=${encodeURIComponent(category)}`);
  if (params.length > 0) queryUrl += `?${params.join('&')}`;

  const res = await API.get(queryUrl);
  if (!res.success) {
    booksListContainer.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--text-danger);">Error fetching catalog catalog.</div>';
    return;
  }

  // Populate Categories Filter once on load if empty
  const filterSelect = document.getElementById('catalog-category-filter');
  if (filterSelect && filterSelect.options.length === 1 && res.categories) {
    res.categories.forEach(cat => {
      filterSelect.innerHTML += `<option value="${escapeHtml(cat)}">${escapeHtml(cat)}</option>`;
    });
    // Set active filter value if any
    if (category) filterSelect.value = category;
  }

  booksListContainer.innerHTML = '';

  if (!res.books || res.books.length === 0) {
    booksListContainer.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 48px; color: var(--text-light)">No matching titles in library.</div>';
    return;
  }

  res.books.forEach(b => {
    let actionBtn = '';
    if (role === 'admin' || role === 'librarian') {
      actionBtn = `
        <div style="display: flex; gap: 8px; margin-top: 16px;">
          <button class="glass-btn glass-btn-secondary" style="flex-grow: 1; padding: 8px; font-size: 0.85rem;" onclick="openBookModal(${JSON.stringify(b).replace(/"/g, '&quot;')})">
            Edit
          </button>
          <button class="glass-btn glass-btn-danger" style="flex-grow: 1; padding: 8px; font-size: 0.85rem;" onclick="deleteBook(${b.id})">
            Delete
          </button>
        </div>
      `;
    } else {
      // Student borrowing button
      const isAvailable = b.available_quantity > 0;
      actionBtn = `
        <button class="glass-btn" style="width: 100%; padding: 10px; font-size: 0.9rem; margin-top: 16px; ${!isAvailable ? 'opacity: 0.5; cursor: not-allowed; background: var(--border-color);' : ''}" 
          onclick="${isAvailable ? `borrowBook(${b.id})` : ''}" ${!isAvailable ? 'disabled' : ''}>
          ${isAvailable ? 'Request Borrow' : 'Out of Stock'}
        </button>
      `;
    }

    booksListContainer.innerHTML += `
      <div class="glass-card book-card fade-in">
        <div>
          <span class="book-category badge bg-success-subtle">${escapeHtml(b.category)}</span>
          <h3 class="book-title" title="${escapeHtml(b.title)}">${escapeHtml(b.title)}</h3>
          <div class="book-author">By ${escapeHtml(b.author)}</div>
        </div>
        <div>
          <div class="book-info-row">
            <div>ISBN: <b>${escapeHtml(b.isbn)}</b></div>
            <div>Location: <b>${escapeHtml(b.location)}</b></div>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 0.85rem; color: var(--text-secondary);">
            <span>Available: <b>${b.available_quantity}</b></span>
            <span>Total Stock: <b>${b.quantity}</b></span>
          </div>
          ${actionBtn}
        </div>
      </div>
    `;
  });
}

let filterTimeout = null;
function filterCatalog() {
  clearTimeout(filterTimeout);
  filterTimeout = setTimeout(() => {
    const search = document.getElementById('catalog-search-input').value;
    const category = document.getElementById('catalog-category-filter').value;
    fetchAndRenderBooks(search, category);
  }, 300);
}

// Student: Request Book Borrow
async function borrowBook(bookId) {
  if (confirm('Submit request to borrow this book? You will have 14 days to read it once approved.')) {
    const res = await API.post('/api/library/borrow', { bookId });
    if (res.success) {
      alert(res.message || 'Borrow request sent successfully. Check notifications panel for approval.');
      fetchAndRenderBooks();
    } else {
      alert(res.message || 'Request failed.');
    }
  }
}

// Admin / Librarian: Delete Book Title
async function deleteBook(bookId) {
  if (confirm('Are you sure you want to delete this book from the catalog?')) {
    const res = await API.delete(`/api/library/books/${bookId}`);
    if (res.success) {
      alert(res.message || 'Book deleted successfully.');
      fetchAndRenderBooks();
    } else {
      alert(res.message || 'Error deleting book.');
    }
  }
}

// Admin / Librarian: Add or Edit Book popup Modal
function openBookModal(book = null) {
  const isEdit = book !== null;
  const title = isEdit ? 'Edit Book Properties' : 'Add Book Title to Catalog';

  const formHtml = `
    <form id="book-manager-form" onsubmit="submitBookForm(event, ${isEdit ? book.id : 'null'})">
      <div class="form-group">
        <label for="book-title-input">Book Title</label>
        <input type="text" id="book-title-input" class="glass-input" value="${isEdit ? escapeHtml(book.title) : ''}" placeholder="Concepts of Physics" required>
      </div>
      <div class="form-group">
        <label for="book-author-input">Author Name</label>
        <input type="text" id="book-author-input" class="glass-input" value="${isEdit ? escapeHtml(book.author) : ''}" placeholder="H.C. Verma" required>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label for="book-isbn-input">ISBN Code</label>
          <input type="text" id="book-isbn-input" class="glass-input" value="${isEdit ? escapeHtml(book.isbn) : ''}" placeholder="9788177091878" required>
        </div>
        <div class="form-group">
          <label for="book-category-input">Category</label>
          <input type="text" id="book-category-input" class="glass-input" value="${isEdit ? escapeHtml(book.category) : ''}" placeholder="Physics" required>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label for="book-qty-input">Total Stock Quantity</label>
          <input type="number" id="book-qty-input" class="glass-input" value="${isEdit ? book.quantity : '5'}" min="1" required>
        </div>
        <div class="form-group">
          <label for="book-loc-input">Location Shelf</label>
          <input type="text" id="book-loc-input" class="glass-input" value="${isEdit ? escapeHtml(book.location) : ''}" placeholder="Shelf A-3" required>
        </div>
      </div>

      <div style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 24px; border-top: 1px solid var(--border-color); padding-top: 16px;">
        <button type="button" class="glass-btn glass-btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="submit" class="glass-btn">${isEdit ? 'Save Changes' : 'Add Title'}</button>
      </div>
    </form>
  `;

  showModal(title, formHtml);
}

async function submitBookForm(e, bookId) {
  e.preventDefault();

  const payload = {
    title: document.getElementById('book-title-input').value,
    author: document.getElementById('book-author-input').value,
    isbn: document.getElementById('book-isbn-input').value,
    category: document.getElementById('book-category-input').value,
    quantity: parseInt(document.getElementById('book-qty-input').value, 10),
    location: document.getElementById('book-loc-input').value
  };

  let res;
  if (bookId) {
    res = await API.put(`/api/library/books/${bookId}`, payload);
  } else {
    res = await API.post('/api/library/books', payload);
  }

  if (res.success) {
    alert(res.message || 'Book catalog saved.');
    closeModal();
    fetchAndRenderBooks();
  } else {
    alert(res.message || 'Error processing request.');
  }
}


// ==================== CIRCULATION AND ISSUE LOGS PANEL RENDERING ====================
let circulationActiveTab = 'requested';

async function renderCirculationPanel() {
  const container = document.getElementById('active-panel-body');
  const role = currentUser.role;

  if (role === 'student') {
    // Render Student-specific loan records page
    container.innerHTML = `
      <div style="margin-bottom: 24px;">
        <h2 style="font-weight: 800;">My Library Borrow Logs</h2>
        <p style="color: var(--text-secondary); font-size: 0.9rem;">Track your currently borrowed textbooks and check-out request states.</p>
      </div>
      
      <div class="glass-card panel-section fade-in">
        <div class="glass-table-container">
          <table class="glass-table">
            <thead>
              <tr>
                <th>Book Title</th>
                <th>Request Date</th>
                <th>Status</th>
                <th>Due Date</th>
                <th>Returned Date</th>
              </tr>
            </thead>
            <tbody id="student-borrow-logs-tbody">
              <tr><td colspan="5" style="text-align: center; color: var(--text-light)">Loading records...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    `;
    await fetchStudentBorrowLogs();
  } else {
    // Render Librarian/Admin circulation log manager
    container.innerHTML = `
      <div style="margin-bottom: 24px;">
        <h2 style="font-weight: 800;">Issue & Circulation Desk</h2>
        <p style="color: var(--text-secondary); font-size: 0.9rem;">Review borrow requests, issue books to students, and catalog return check-ins.</p>
      </div>

      <div class="auth-tabs" style="width: 100%; max-width: 480px; margin-bottom: 20px;">
        <div class="auth-tab ${circulationActiveTab === 'requested' ? 'active' : ''}" id="circ-tab-req" onclick="switchCirculationTab('requested')">Pending Requests</div>
        <div class="auth-tab ${circulationActiveTab === 'approved' ? 'active' : ''}" id="circ-tab-act" onclick="switchCirculationTab('approved')">Active Checkouts</div>
        <div class="auth-tab ${circulationActiveTab === 'history' ? 'active' : ''}" id="circ-tab-hist" onclick="switchCirculationTab('history')">Archived Transactions</div>
      </div>
      
      <div class="glass-card panel-section fade-in">
        <div class="glass-table-container">
          <table class="glass-table">
            <thead id="circulation-logs-thead">
              <!-- Headers updated dynamically -->
            </thead>
            <tbody id="circulation-logs-tbody">
              <tr><td colspan="6" style="text-align: center; color: var(--text-light)">Loading transactions...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    `;
    await fetchCirculationDeskLogs();
  }
}

// Students fetch borrow history
async function fetchStudentBorrowLogs() {
  const res = await API.get('/api/library/borrows');
  const tbody = document.getElementById('student-borrow-logs-tbody');
  tbody.innerHTML = '';

  if (!res.success || !res.records || res.records.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-light)">No borrowing history found.</td></tr>';
    return;
  }

  res.records.forEach(r => {
    let statusText = '';
    if (r.status === 'requested') statusText = '<span class="badge bg-warning-subtle">Requested</span>';
    else if (r.status === 'approved') statusText = '<span class="badge bg-info-subtle">Issued</span>';
    else if (r.status === 'returned') statusText = '<span class="badge bg-success-subtle">Returned</span>';
    else statusText = `<span class="badge bg-danger-subtle">${r.status}</span>`;

    const reqDate = new Date(r.request_date).toLocaleDateString();
    const dueDate = r.due_date ? new Date(r.due_date).toLocaleDateString() : '--';
    const retDate = r.return_date ? new Date(r.return_date).toLocaleDateString() : '--';

    tbody.innerHTML += `
      <tr>
        <td>
          <b>${escapeHtml(r.book_title)}</b>
          <div style="font-size: 0.75rem; color: var(--text-light);">Rack: ${escapeHtml(r.location)}</div>
        </td>
        <td>${reqDate}</td>
        <td>${statusText}</td>
        <td>${dueDate}</td>
        <td>${retDate}</td>
      </tr>
    `;
  });
}

// Librarians/Admins switch tabs
function switchCirculationTab(tabId) {
  circulationActiveTab = tabId;
  
  document.querySelectorAll("[id^='circ-tab-']").forEach(el => el.classList.remove('active'));
  const activeEl = document.getElementById(`circ-tab-${tabId === 'requested' ? 'req' : tabId === 'approved' ? 'act' : 'hist'}`);
  if (activeEl) activeEl.classList.add('active');

  fetchCirculationDeskLogs();
}

async function fetchCirculationDeskLogs() {
  const thead = document.getElementById('circulation-logs-thead');
  const tbody = document.getElementById('circulation-logs-tbody');
  
  tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-light)">Loading logs...</td></tr>';

  // 1. Build Headers based on tab type
  if (circulationActiveTab === 'requested') {
    thead.innerHTML = `
      <tr>
        <th>Student Name</th>
        <th>Requested Book</th>
        <th>ISBN</th>
        <th>Request Date</th>
        <th>Actions</th>
      </tr>
    `;
  } else if (circulationActiveTab === 'approved') {
    thead.innerHTML = `
      <tr>
        <th>Student Name</th>
        <th>Borrowed Book</th>
        <th>Issued On</th>
        <th>Due Date</th>
        <th>Handled By</th>
        <th>Actions</th>
      </tr>
    `;
  } else {
    thead.innerHTML = `
      <tr>
        <th>Student Name</th>
        <th>Book Title</th>
        <th>Request Date</th>
        <th>Final Status</th>
        <th>Due Date</th>
        <th>Return Date</th>
      </tr>
    `;
  }

  const res = await API.get('/api/library/borrows');
  tbody.innerHTML = '';

  if (!res.success || !res.records) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-danger)">Error loading log records.</td></tr>';
    return;
  }

  // Filter local data based on tab state
  let filtered = [];
  if (circulationActiveTab === 'requested') {
    filtered = res.records.filter(r => r.status === 'requested');
  } else if (circulationActiveTab === 'approved') {
    filtered = res.records.filter(r => r.status === 'approved');
  } else {
    // History includes returned and rejected
    filtered = res.records.filter(r => r.status === 'returned' || r.status === 'rejected');
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 24px; color: var(--text-light)">No transactions matches.</td></tr>`;
    return;
  }

  filtered.forEach(r => {
    const reqDateStr = new Date(r.request_date).toLocaleDateString();
    const issDateStr = r.issue_date ? new Date(r.issue_date).toLocaleDateString() : '--';
    const dueDateStr = r.due_date ? new Date(r.due_date).toLocaleDateString() : '--';
    const retDateStr = r.return_date ? new Date(r.return_date).toLocaleDateString() : '--';

    if (circulationActiveTab === 'requested') {
      tbody.innerHTML += `
        <tr>
          <td><b>${escapeHtml(r.student_name)}</b><br><span style="font-size:0.75rem; color:var(--text-light);">${escapeHtml(r.student_email)}</span></td>
          <td><b>${escapeHtml(r.book_title)}</b></td>
          <td>${escapeHtml(r.location)}</td>
          <td>${reqDateStr}</td>
          <td>
            <div style="display: flex; gap: 8px;">
              <button class="glass-btn" style="padding: 6px 12px; font-size: 0.8rem; background: var(--success); box-shadow: none;" onclick="approveBorrowRequest(${r.id})">Approve</button>
              <button class="glass-btn glass-btn-danger" style="padding: 6px 12px; font-size: 0.8rem; box-shadow: none;" onclick="rejectBorrowRequest(${r.id})">Reject</button>
            </div>
          </td>
        </tr>
      `;
    } else if (circulationActiveTab === 'approved') {
      // Check if overdue
      const isOverdue = new Date(r.due_date) < new Date();
      tbody.innerHTML += `
        <tr>
          <td><b>${escapeHtml(r.student_name)}</b></td>
          <td><b>${escapeHtml(r.book_title)}</b></td>
          <td>${issDateStr}</td>
          <td style="${isOverdue ? 'color: var(--danger); font-weight: 700;' : ''}">${dueDateStr} ${isOverdue ? '<span style="font-size:0.7rem; display:block; color:var(--danger)">OVERDUE</span>' : ''}</td>
          <td>${escapeHtml(r.librarian_name || 'System')}</td>
          <td>
            <button class="glass-btn" style="padding: 6px 12px; font-size: 0.8rem; background: var(--accent); box-shadow: none;" onclick="returnBookRequest(${r.id})">
              Mark Returned
            </button>
          </td>
        </tr>
      `;
    } else {
      let statusBadge = '';
      if (r.status === 'returned') statusBadge = '<span class="badge bg-success-subtle">Returned</span>';
      else statusBadge = '<span class="badge bg-danger-subtle">Rejected</span>';

      tbody.innerHTML += `
        <tr>
          <td><b>${escapeHtml(r.student_name)}</b></td>
          <td><b>${escapeHtml(r.book_title)}</b></td>
          <td>${reqDateStr}</td>
          <td>${statusBadge}</td>
          <td>${dueDateStr}</td>
          <td>${retDateStr}</td>
        </tr>
      `;
    }
  });
}

// Issue Approve Action
async function approveBorrowRequest(recordId) {
  const res = await API.post('/api/library/approve', { recordId });
  if (res.success) {
    alert('Borrow checkout approved. Book is marked issued.');
    fetchCirculationDeskLogs();
  } else {
    alert(res.message || 'Error approving request.');
  }
}

// Issue Reject Action
async function rejectBorrowRequest(recordId) {
  if (confirm('Decline borrow request for this student?')) {
    const res = await API.post('/api/library/reject', { recordId });
    if (res.success) {
      alert('Request declined.');
      fetchCirculationDeskLogs();
    } else {
      alert(res.message || 'Error rejecting request.');
    }
  }
}

// Issue Return Action
async function returnBookRequest(recordId) {
  const res = await API.post('/api/library/return', { recordId });
  if (res.success) {
    alert('Book returned successfully. Stock quantities incremented.');
    fetchCirculationDeskLogs();
  } else {
    alert(res.message || 'Error processing return.');
  }
}
