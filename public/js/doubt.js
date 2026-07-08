let rawDoubtsList = [];
let activeDoubtId = null;

// Panel entry point for Doubt forum
async function renderDoubtForumPanel() {
  const container = document.getElementById('active-panel-body');
  const role = currentUser.role;

  container.innerHTML = `
    <div style="margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
      <div>
        <h2 style="font-weight: 800;">Doubt Discussion Forum</h2>
        <p style="color: var(--text-secondary); font-size: 0.9rem;">Ask questions, share syllabus clarifications, and peer review solutions.</p>
      </div>
      <button class="glass-btn" onclick="openAskDoubtModal()">
        + Ask a Doubt
      </button>
    </div>

    <div class="dashboard-split-grid fade-in" style="grid-template-columns: 1.2fr 1.5fr; gap: 24px; align-items: start;">
      
      <!-- Left Column: Search Filters & Doubt Cards List -->
      <div>
        <div class="catalog-controls" style="margin-bottom: 20px; display: flex; flex-direction: column; gap: 10px; width: 100%;">
          <div style="display: flex; gap: 10px; width: 100%;">
            <div class="catalog-search-wrapper" style="flex-grow: 1;">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              <input type="text" id="forum-search-input" class="glass-input catalog-search" placeholder="Search discussion threads..." oninput="filterDoubts()">
            </div>
            <select id="forum-sort-select" class="glass-input catalog-filter" onchange="fetchDoubtsList()" style="cursor: pointer; max-width: 140px;">
              <option value="recent">Recent</option>
              <option value="popular">Popular</option>
            </select>
          </div>
          <select id="forum-exam-filter" class="glass-input catalog-filter" onchange="fetchDoubtsList()" style="cursor: pointer; width: 100%;">
            <option value="all">All Exams</option>
          </select>
        </div>

        <div id="doubts-threads-list" style="display: flex; flex-direction: column; gap: 12px; max-height: 520px; overflow-y: auto;">
          <div class="spinner flex-center" style="margin: 40px auto;"></div>
        </div>
      </div>

      <!-- Right Column: Active Thread Details & Reply form -->
      <div class="glass-card panel-section" id="active-doubt-detail-panel" style="min-height: 480px; display: flex; flex-direction: column; justify-content: center; align-items: center; color: var(--text-light); text-align: center;">
        Select a discussion thread from the left column to view replies or leave comments.
      </div>

    </div>
  `;

  // Populate exam filter dropdown
  const examFilter = document.getElementById('forum-exam-filter');
  const res = await API.get('/api/competitive-exams');
  if (res.success && res.exams) {
    res.exams.forEach(e => {
      examFilter.innerHTML += `<option value="${e.id}">${escapeHtml(e.name)}</option>`;
    });
  }

  await fetchDoubtsList();
}

async function fetchDoubtsList() {
  const sortBy = document.getElementById('forum-sort-select').value;
  const examId = document.getElementById('forum-exam-filter').value;
  const grid = document.getElementById('doubts-threads-list');

  let url = `/api/doubts?sortBy=${sortBy}`;
  if (examId !== 'all') url += `&examId=${examId}`;

  const res = await API.get(url);
  if (res.success) {
    rawDoubtsList = res.doubts || [];
    renderDoubtsThreadsList(rawDoubtsList);
  } else {
    grid.innerHTML = '<div style="color:var(--text-danger); text-align:center;">Error loading doubts catalog</div>';
  }
}

function renderDoubtsThreadsList(list) {
  const container = document.getElementById('doubts-threads-list');
  container.innerHTML = '';

  if (list.length === 0) {
    container.innerHTML = '<div style="color:var(--text-light); text-align:center; padding: 24px;">No active discussions found.</div>';
    return;
  }

  list.forEach(d => {
    const isSolved = d.is_solved === 1;
    const isPinned = d.is_pinned === 1;
    
    container.innerHTML += `
      <div class="glass-card doubt-thread-card ${d.id === activeDoubtId ? 'active' : ''} fade-in" 
           style="padding: 14px; cursor: pointer; border: 1px solid ${d.id === activeDoubtId ? 'var(--accent)' : 'var(--border-color)'}; transition: all 0.2s; position: relative;"
           onclick="viewDoubtDetails(${d.id})">
        
        ${isPinned ? `<span class="badge bg-warning-subtle" style="font-size:0.65rem; position:absolute; top:8px; right:8px;">📌 Pinned</span>` : ''}

        <div style="padding-right: 60px;">
          <span style="font-size: 0.725rem; color: var(--text-light);">Asked by <b>${escapeHtml(d.user_name)}</b></span>
          <h4 style="font-weight: 700; font-size: 0.95rem; margin: 4px 0 8px 0; color: ${isSolved ? 'var(--success)' : 'inherit'};">
            ${isSolved ? '[Resolved] ' : ''}${escapeHtml(d.title)}
          </h4>
        </div>

        <div style="font-size: 0.75rem; color: var(--text-light); display: flex; justify-content: space-between; border-top: 1px dashed var(--border-color); padding-top: 8px;">
          <span>Upvotes: <b>${d.upvotes_count}</b> &bull; Comments: <b>${d.replies_count}</b></span>
          <span>${new Date(d.created_at).toLocaleDateString()}</span>
        </div>
      </div>
    `;
  });
}

function filterDoubts() {
  const queryVal = document.getElementById('forum-search-input').value.toLowerCase();
  const filtered = rawDoubtsList.filter(d => {
    return d.title.toLowerCase().includes(queryVal) || d.description.toLowerCase().includes(queryVal);
  });
  renderDoubtsThreadsList(filtered);
}

// ---------------- THREAD DETAILS PANEL RENDERER ----------------

async function viewDoubtDetails(id) {
  activeDoubtId = id;
  
  // Highlight active card on left
  document.querySelectorAll('.doubt-thread-card').forEach(el => el.classList.remove('active'));
  
  const rightPanel = document.getElementById('active-doubt-detail-panel');
  rightPanel.innerHTML = '<div class="spinner flex-center"></div>';

  const res = await API.get(`/api/doubts/${id}`);
  if (!res.success) {
    rightPanel.innerHTML = '<div style="color:var(--text-danger)">Error loading thread details.</div>';
    return;
  }

  const d = res.doubt;
  const replies = res.replies || [];
  const role = currentUser.role;
  const isSolved = d.is_solved === 1;
  const isPinned = d.is_pinned === 1;
  const isLocked = d.is_locked === 1;

  // Compile replies logs HTML
  let repliesHtml = '';
  if (replies.length === 0) {
    repliesHtml = '<div style="text-align:center; color:var(--text-light); padding:20px; font-size:0.85rem;" id="no-comments-label">No replies posted yet. Be the first to answer!</div>';
  } else {
    replies.forEach(r => {
      const isAdminReply = r.is_admin_reply === 1;
      
      repliesHtml += `
        <div style="padding: 10px; margin-bottom: 8px; border-radius: var(--radius-sm); border: 1px solid var(--border-color); background: ${isAdminReply ? 'rgba(79, 70, 229, 0.04)' : 'rgba(255,255,255,0.01)'};">
          <div style="display:flex; justify-content:space-between; font-size: 0.725rem; color: var(--text-light); margin-bottom:4px;">
            <span><b>${escapeHtml(r.user_name)}</b> ${isAdminReply ? '<span class="badge bg-danger-subtle" style="font-size:0.6rem;">Admin Staff</span>' : ''}</span>
            <span>${new Date(r.created_at).toLocaleString([], {hour:'2-digit', minute:'2-digit', month:'short', day:'numeric'})}</span>
          </div>
          <div style="font-size: 0.85rem; line-height:1.4;">${escapeHtml(r.message)}</div>
        </div>
      `;
    });
  }

  // Admin moderation tags
  let adminControls = '';
  if (role === 'admin') {
    adminControls = `
      <div style="border-top:1px dashed var(--border-color); padding-top:10px; margin-top:12px; display:flex; gap:10px; flex-wrap:wrap;">
        <button class="glass-btn glass-btn-secondary" style="padding:4px 8px; font-size:0.75rem;" onclick="adminToggleDoubtPin(${d.id}, ${isPinned ? 0 : 1})">
          ${isPinned ? '📌 Unpin Thread' : '📌 Pin Thread'}
        </button>
        <button class="glass-btn glass-btn-secondary" style="padding:4px 8px; font-size:0.75rem;" onclick="adminToggleDoubtLock(${d.id}, ${isLocked ? 0 : 1})">
          ${isLocked ? '🔓 Unlock Thread' : '🔒 Lock Thread'}
        </button>
        <button class="glass-btn glass-btn-danger" style="padding:4px 8px; font-size:0.75rem;" onclick="adminDeleteDoubt(${d.id})">
          🗑️ Delete Thread
        </button>
      </div>
    `;
  }

  // Solved toggle button (Visible to author of thread or admin)
  let solvedActionBtn = '';
  if (d.user_id === currentUser.id || role === 'admin') {
    solvedActionBtn = `
      <button class="glass-btn" style="padding:6px 12px; font-size:0.8rem; background: ${isSolved ? 'rgba(255,255,255,0.03)' : 'rgba(16, 185, 129, 0.15)'};" onclick="toggleDoubtSolved(${d.id}, ${isSolved ? 0 : 1})">
        ${isSolved ? 'Mark Unsolved' : 'Mark Solved'}
      </button>
    `;
  }

  rightPanel.style.justifyContent = 'flex-start';
  rightPanel.style.alignItems = 'stretch';
  rightPanel.style.textAlign = 'left';

  rightPanel.innerHTML = `
    <!-- Top Details -->
    <div>
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
        <span class="badge ${isSolved ? 'bg-success-subtle' : 'bg-warning-subtle'}">${isSolved ? 'Solved / Resolved' : 'Open Doubt'}</span>
        <span style="font-size:0.8rem; color:var(--text-light);">${new Date(d.created_at).toLocaleDateString()}</span>
      </div>

      <h3 style="font-size: 1.2rem; font-weight: 800; margin-bottom: 8px; line-height: 1.4;">${escapeHtml(d.title)}</h3>
      <p style="font-size: 0.75rem; color: var(--text-light); margin-bottom: 12px;">Posted by <b>${escapeHtml(d.user_name)}</b> &bull; Association: <b>${d.exam_name ? escapeHtml(d.exam_name) : 'General Prep'}</b></p>
      
      <p style="font-size: 0.9rem; line-height: 1.5; color: var(--text-secondary); background: rgba(255,255,255,0.015); padding: 12px; border-radius: var(--radius-sm); border: 1px solid var(--border-color); margin-bottom: 16px;">
        ${escapeHtml(d.description)}
      </p>

      <!-- Upvote & Solved -->
      <div style="display:flex; gap:12px; align-items:center;">
        <button class="glass-btn" style="padding: 6px 12px; font-size: 0.8rem; background: ${d.is_upvoted === 1 ? 'rgba(79,70,229,0.15)' : 'rgba(255,255,255,0.03)'};" onclick="toggleDoubtUpvote(${d.id})">
          ▲ Upvote Thumbs (${d.upvotes_count})
        </button>
        ${solvedActionBtn}
      </div>

      ${adminControls}
    </div>

    <!-- Replies list -->
    <div style="margin-top: 24px; border-top: 1px solid var(--border-color); padding-top: 16px; flex-grow: 1;">
      <h5 style="font-weight: 700; margin-bottom: 12px; color: var(--text-secondary);">Replies & Comments</h5>
      
      <div id="forum-replies-list-container" style="max-height: 200px; overflow-y: auto; padding-right: 4px; margin-bottom: 16px;">
        ${repliesHtml}
      </div>

      <!-- Add comment box -->
      ${isLocked ? `
        <div style="text-align:center; padding:12px; font-size:0.8rem; background:rgba(239, 68, 68, 0.05); color:var(--text-danger); border-radius:var(--radius-sm);">
          🔒 This discussion thread has been locked by administrator staff. No further replies can be added.
        </div>
      ` : `
        <form id="forum-reply-form" onsubmit="submitDoubtReply(event, ${d.id})" style="display:flex; gap:8px;">
          <input type="text" id="forum-reply-message" class="glass-input" placeholder="Type your reply here..." style="font-size:0.85rem;" required>
          <button type="submit" class="glass-btn" style="padding: 8px 16px; font-size:0.85rem;">Post Reply</button>
        </form>
      `}
    </div>
  `;

  // Re-highlight active thread card on left column
  fetchDoubtsList();
}

// ---------------- DISCUSSION CORE TRANSACTIONS ----------------

async function toggleDoubtUpvote(id) {
  const res = await API.post('/api/doubts/upvote', { id });
  if (res.success) viewDoubtDetails(id);
}

async function toggleDoubtSolved(id, isSolved) {
  const res = await API.post('/api/doubts/solved', { id, isSolved });
  if (res.success) viewDoubtDetails(id);
}

async function submitDoubtReply(e, doubtId) {
  e.preventDefault();
  const messageInput = document.getElementById('forum-reply-message');
  const message = messageInput.value.trim();

  if (!message) return;

  const res = await API.post('/api/doubts/reply', { doubtId, message });
  if (res.success) {
    messageInput.value = '';
    viewDoubtDetails(doubtId);
  } else {
    alert(res.message || 'Error posting comment');
  }
}

// Admin Moderation API calls
async function adminToggleDoubtPin(id, isPinned) {
  const res = await API.post('/api/doubts/pin', { id, isPinned });
  if (res.success) viewDoubtDetails(id);
}

async function adminToggleDoubtLock(id, isLocked) {
  const res = await API.post('/api/doubts/lock', { id, isLocked });
  if (res.success) viewDoubtDetails(id);
}

async function adminDeleteDoubt(id) {
  if (confirm('Are you sure you want to delete this discussion thread and all its replies?')) {
    const res = await API.delete(`/api/doubts/${id}`);
    if (res.success) {
      alert(res.message);
      activeDoubtId = null;
      renderDoubtForumPanel();
    }
  }
}

// ---------------- DIALOG FOR ASK DOUBT ----------------

function openAskDoubtModal() {
  const content = `
    <form id="ask-doubt-form" onsubmit="submitCreatedDoubt(event)">
      <div class="form-group">
        <label>Doubt Question Title</label>
        <input type="text" id="ask-doubt-title" class="glass-input" placeholder="e.g. Why is QuickSort O(N^2) in worst case?" required>
      </div>
      
      <div class="form-group">
        <label>Elaborated Description / Query Statement</label>
        <textarea id="ask-doubt-desc" class="glass-input" rows="4" placeholder="Detail your exact query or post steps of equations you tried..." required></textarea>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>Linked Exam Profile (Optional)</label>
          <select id="ask-doubt-exam" class="glass-input" style="cursor:pointer;" onchange="loadAskDoubtSubjectsDropdown()">
            <option value="null">General Prep</option>
          </select>
        </div>
        <div class="form-group" id="ask-doubt-subject-wrapper" style="display:none;">
          <label>Linked Subject (Optional)</label>
          <select id="ask-doubt-subject" class="glass-input" style="cursor:pointer;">
            <option value="null">Select Subject</option>
          </select>
        </div>
      </div>

      <div style="display:flex; justify-content:flex-end; gap:12px; border-top:1px solid var(--border-color); padding-top:16px; margin-top:20px;">
        <button type="button" class="glass-btn glass-btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="submit" class="glass-btn">Post Doubt</button>
      </div>
    </form>
  `;

  showModal('Ask a Doubt Thread', content);

  // Populate exams in modal
  const dropdown = document.getElementById('ask-doubt-exam');
  API.get('/api/competitive-exams').then(res => {
    if (res.success && res.exams) {
      res.exams.forEach(e => {
        dropdown.innerHTML += `<option value="${e.id}">${escapeHtml(e.name)}</option>`;
      });
    }
  });
}

async function loadAskDoubtSubjectsDropdown() {
  const examId = document.getElementById('ask-doubt-exam').value;
  const wrapper = document.getElementById('ask-doubt-subject-wrapper');
  const subDropdown = document.getElementById('ask-doubt-subject');

  subDropdown.innerHTML = '<option value="null">Select Subject</option>';

  if (examId === 'null') {
    wrapper.style.display = 'none';
    return;
  }

  const res = await API.get(`/api/competitive-exams/${examId}`);
  if (res.success && res.subjects && res.subjects.length > 0) {
    wrapper.style.display = 'block';
    res.subjects.forEach(s => {
      subDropdown.innerHTML += `<option value="${s.id}">${escapeHtml(s.name)}</option>`;
    });
  } else {
    wrapper.style.display = 'none';
  }
}

async function submitCreatedDoubt(e) {
  e.preventDefault();

  const title = document.getElementById('ask-doubt-title').value;
  const description = document.getElementById('ask-doubt-desc').value;
  const examId = document.getElementById('ask-doubt-exam').value;
  const subjectId = document.getElementById('ask-doubt-subject').value;

  const payload = {
    title,
    description,
    examId,
    subjectId
  };

  const res = await API.post('/api/doubts/ask', payload);
  if (res.success) {
    alert(res.message || 'Question posted successfully.');
    closeModal();
    renderDoubtForumPanel();
  } else {
    alert(res.message || 'Error posting doubt.');
  }
}
