let rawSyllabusTree = [];

// Panel entry point for Syllabus tracker
async function renderSyllabusPanel() {
  const container = document.getElementById('active-panel-body');
  const role = currentUser.role;

  container.innerHTML = `
    <div style="margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
      <div>
        <h2 style="font-weight: 800;">Syllabus Progress Tracker</h2>
        <p style="color: var(--text-secondary); font-size: 0.9rem;">Monitor unit coverage, check off completed subjects topics, and view preparation stats.</p>
      </div>
      <div style="display:flex; gap:12px;">
        <button class="glass-btn glass-btn-secondary" onclick="printSyllabusSheet()">
          <svg style="width:16px; height:16px; fill:none; stroke:currentColor; stroke-width:2; margin-right:4px;" viewBox="0 0 24 24"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
          Print Syllabus
        </button>
      </div>
    </div>

    <!-- Exam Selector & Progress Bar Card -->
    <div class="glass-card" style="padding: 20px; margin-bottom: 24px; display: flex; flex-direction: column; gap: 16px;">
      <div style="display: flex; gap: 16px; align-items: center; flex-wrap: wrap;">
        <div style="flex-grow: 1; min-width: 250px;">
          <label style="font-size: 0.8rem; color: var(--text-light); margin-bottom: 6px; display: block;">Select Competitive Exam</label>
          <select id="syllabus-exam-select" class="glass-input" style="cursor: pointer; padding: 10px;" onchange="loadSyllabusForSelectedExam()">
            <option value="">-- Choose Exam --</option>
          </select>
        </div>
        
        <!-- Add Subject (Admin only) -->
        ${role === 'admin' ? `
          <div style="align-self: flex-end;">
            <button class="glass-btn" onclick="openAddSubjectSyllabusModal()" id="add-subject-btn" disabled>
              + Add Subject
            </button>
          </div>
        ` : ''}
      </div>

      <!-- Live Progress Bar -->
      <div id="syllabus-progress-card-section" class="hidden" style="border-top: 1px solid var(--border-color); padding-top: 16px;">
        <div style="display: flex; justify-content: space-between; font-size: 0.9rem; font-weight: 700; margin-bottom: 8px;">
          <span>Syllabus Tracked Completion</span>
          <span id="syllabus-progress-percent">0%</span>
        </div>
        <div class="progress-bar-container" style="background: rgba(255,255,255,0.05); height: 10px; border-radius: 5px; overflow: hidden; width: 100%;">
          <div id="syllabus-progress-fill" style="width: 0%; height: 100%; background: linear-gradient(135deg, var(--success) 0%, #059669 100%); transition: width 0.4s ease;"></div>
        </div>
        <div style="font-size: 0.75rem; color: var(--text-light); margin-top: 6px;" id="syllabus-progress-fraction">
          0 / 0 Topics Checked
        </div>
      </div>
    </div>

    <!-- Active Syllabus tree view container -->
    <div id="syllabus-tree-view-container">
      <div class="glass-card" style="padding: 40px; text-align: center; color: var(--text-light);">
        Please select a competitive exam profile above to display its topic structure.
      </div>
    </div>
  `;

  // Fetch competitive exams to populate selection dropdown
  const select = document.getElementById('syllabus-exam-select');
  const res = await API.get('/api/competitive-exams');
  if (res.success && res.exams) {
    res.exams.forEach(e => {
      select.innerHTML += `<option value="${e.id}">${escapeHtml(e.name)}</option>`;
    });
  }
}

async function loadSyllabusForSelectedExam() {
  const examId = document.getElementById('syllabus-exam-select').value;
  const treeContainer = document.getElementById('syllabus-tree-view-container');
  const progressSection = document.getElementById('syllabus-progress-card-section');
  const addSubBtn = document.getElementById('add-subject-btn');

  if (!examId) {
    treeContainer.innerHTML = `
      <div class="glass-card" style="padding: 40px; text-align: center; color: var(--text-light);">
        Please select a competitive exam profile above to display its topic structure.
      </div>
    `;
    progressSection.classList.add('hidden');
    if (addSubBtn) addSubBtn.disabled = true;
    return;
  }

  if (addSubBtn) addSubBtn.disabled = false;

  treeContainer.innerHTML = '<div class="spinner flex-center" style="margin: 40px auto;"></div>';

  // Fetch Syllabus tree data
  const [syllabusRes, progressRes] = await Promise.all([
    API.get(`/api/syllabus/exam/${examId}`),
    API.get(`/api/syllabus/exam/${examId}/progress`)
  ]);

  if (syllabusRes.success && progressRes.success) {
    rawSyllabusTree = syllabusRes.syllabus || [];
    renderSyllabusProgress(progressRes.stats);
    renderSyllabusTree(rawSyllabusTree);
  } else {
    treeContainer.innerHTML = '<div style="text-align:center; color:var(--text-danger)">Error fetching syllabus structure</div>';
  }
}

function renderSyllabusProgress(stats) {
  const progressSection = document.getElementById('syllabus-progress-card-section');
  progressSection.classList.remove('hidden');

  document.getElementById('syllabus-progress-percent').textContent = `${stats.percentage}%`;
  document.getElementById('syllabus-progress-fill').style.width = `${stats.percentage}%`;
  document.getElementById('syllabus-progress-fraction').textContent = `${stats.completedTopics} / ${stats.totalTopics} Topics Completed`;
}

function renderSyllabusTree(subjectsList) {
  const container = document.getElementById('syllabus-tree-view-container');
  container.innerHTML = '';
  const role = currentUser.role;

  if (subjectsList.length === 0) {
    container.innerHTML = `
      <div class="glass-card" style="padding: 40px; text-align: center; color: var(--text-light);">
        No syllabus topics added yet. ${role === 'admin' ? 'Click "Add Subject" to begin drafting.' : ''}
      </div>
    `;
    return;
  }

  subjectsList.forEach(sub => {
    // Subject block
    const subDiv = document.createElement('div');
    subDiv.className = 'glass-card panel-section fade-in';
    subDiv.style.marginBottom = '24px';
    subDiv.style.padding = '20px';

    let subAdminBtn = '';
    if (role === 'admin') {
      subAdminBtn = `
        <div style="display: flex; gap: 8px;">
          <button class="glass-btn glass-btn-secondary" style="padding: 6px 12px; font-size: 0.75rem;" onclick="openAddUnitSyllabusModal(${sub.id})">+ Add Unit</button>
          <button class="glass-btn glass-btn-danger" style="padding: 6px 10px; font-size: 0.75rem;" onclick="deleteSyllabusSubject(${sub.id})">&times;</button>
        </div>
      `;
    }

    subDiv.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 12px; margin-bottom: 16px;">
        <h4 style="font-size: 1.15rem; font-weight: 800; color: var(--accent);">${escapeHtml(sub.name)}</h4>
        ${subAdminBtn}
      </div>
      <div class="units-container-grid" style="display: flex; flex-direction: column; gap: 16px;">
        <!-- Units filled here -->
      </div>
    `;

    const unitsGrid = subDiv.querySelector('.units-container-grid');
    const units = sub.units || [];

    if (units.length === 0) {
      unitsGrid.innerHTML = '<div style="color:var(--text-light); font-size:0.85rem; font-style:italic;">No Units drafted under this Subject.</div>';
    } else {
      units.forEach(un => {
        // Unit card block
        const unCard = document.createElement('div');
        unCard.style.padding = '14px';
        unCard.style.borderRadius = 'var(--radius-sm)';
        unCard.style.background = 'rgba(255,255,255,0.01)';
        unCard.style.border = '1px solid var(--border-color)';
        
        let unitAdmin = '';
        if (role === 'admin') {
          unitAdmin = `
            <div style="display: flex; gap: 6px;">
              <button class="glass-btn glass-btn-secondary" style="padding: 4px 8px; font-size: 0.7rem;" onclick="openAddTopicSyllabusModal(${un.id})">+ Add Topic</button>
              <button class="glass-btn glass-btn-danger" style="padding: 4px 6px; font-size: 0.7rem;" onclick="deleteSyllabusUnit(${un.id})">&times;</button>
            </div>
          `;
        }

        unCard.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; border-bottom: 1px dashed var(--border-color); padding-bottom:6px;">
            <h5 style="font-weight:700; font-size:0.95rem;">${escapeHtml(un.name)}</h5>
            ${unitAdmin}
          </div>
          <div class="topics-list-container" style="display:flex; flex-direction:column; gap:8px;">
            <!-- Topics list filled here -->
          </div>
        `;

        const topicsList = unCard.querySelector('.topics-list-container');
        const topics = un.topics || [];

        if (topics.length === 0) {
          topicsList.innerHTML = '<div style="color:var(--text-light); font-size:0.8rem; font-style:italic;">No topics listed.</div>';
        } else {
          topics.forEach(t => {
            const isCompleted = t.is_completed === 1;
            const diffClass = t.difficulty === 'Hard' ? 'bg-danger-subtle' : t.difficulty === 'Medium' ? 'bg-warning-subtle' : 'bg-success-subtle';
            
            let topicAdmin = '';
            if (role === 'admin') {
              topicAdmin = `<button class="glass-btn glass-btn-danger" style="padding: 2px 6px; font-size: 0.65rem;" onclick="deleteSyllabusTopic(${t.id})">&times;</button>`;
            }

            topicsList.innerHTML += `
              <div style="display:flex; justify-content:space-between; align-items:center; padding: 6px 8px; background:rgba(255,255,255,0.015); border-radius:4px; border:1px solid var(--border-color);">
                <div style="display:flex; align-items:center; gap:10px;">
                  <input type="checkbox" style="width:16px; height:16px; cursor:pointer;" ${isCompleted ? 'checked' : ''} onchange="toggleSyllabusTopicCheck(${t.id}, this)">
                  <span style="font-size:0.85rem; font-weight:600; text-decoration:${isCompleted ? 'line-through' : 'none'}; color:${isCompleted ? 'var(--text-light)' : 'inherit'};">${escapeHtml(t.name)}</span>
                </div>
                
                <div style="display:flex; align-items:center; gap:8px;">
                  <span class="badge ${diffClass}" style="font-size:0.65rem;">${t.difficulty}</span>
                  ${t.weightage ? `<span style="font-size:0.75rem; color:var(--text-light);">Weightage: <b>${escapeHtml(t.weightage)}</b></span>` : ''}
                  ${t.prep_time ? `<span style="font-size:0.75rem; color:var(--text-light);">Time: <b>${escapeHtml(t.prep_time)}</b></span>` : ''}
                  ${topicAdmin}
                </div>
              </div>
            `;
          });
        }

        unitsGrid.appendChild(unCard);
      });
    }

    container.appendChild(subDiv);
  });
}

// Checkbox progress toggling
async function toggleSyllabusTopicCheck(topicId, checkbox) {
  const status = checkbox.checked ? 1 : 0;
  const examId = document.getElementById('syllabus-exam-select').value;

  const res = await API.post('/api/syllabus/toggle', { topicId, status });
  if (res.success) {
    // Reload progress stats without rebuilding tree
    const statsRes = await API.get(`/api/syllabus/exam/${examId}/progress`);
    if (statsRes.success) {
      renderSyllabusProgress(statsRes.stats);
    }
  } else {
    checkbox.checked = !checkbox.checked; // revert
    alert(res.message || 'Error updating status');
  }
}

// Print/PDF trigger
function printSyllabusSheet() {
  const examSelect = document.getElementById('syllabus-exam-select');
  if (!examSelect.value) {
    alert('Please select an exam first.');
    return;
  }

  const examName = examSelect.options[examSelect.selectedIndex].text;
  const printWindow = window.open('', '_blank');
  
  // Build a printable table view
  let printHtml = `
    <html>
      <head>
        <title>Syllabus Sheet - ${examName}</title>
        <style>
          body { font-family: 'Segoe UI', sans-serif; padding: 40px; }
          h2 { color: #4f46e5; border-bottom: 2px solid #ddd; padding-bottom: 10px; }
          .subject-section { margin-bottom: 30px; }
          .subject-title { font-size: 1.25rem; font-weight: bold; margin-bottom: 10px; color: #1f2937; }
          .unit-section { margin-left: 20px; margin-bottom: 20px; border-left: 3px solid #4f46e5; padding-left: 12px; }
          .unit-title { font-weight: 700; margin-bottom: 8px; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 0.9rem; }
          th { background: #f3f4f6; }
        </style>
      </head>
      <body>
        <h2>Syllabus Outline: ${examName}</h2>
  `;

  rawSyllabusTree.forEach(sub => {
    printHtml += `
      <div class="subject-section">
        <div class="subject-title">${escapeHtml(sub.name)}</div>
    `;
    (sub.units || []).forEach(un => {
      printHtml += `
        <div class="unit-section">
          <div class="unit-title">${escapeHtml(un.name)}</div>
          <table>
            <thead>
              <tr>
                <th style="width:50%;">Topic Name</th>
                <th>Difficulty</th>
                <th>Weightage</th>
                <th>Prep Time</th>
              </tr>
            </thead>
            <tbody>
      `;
      (un.topics || []).forEach(t => {
        printHtml += `
          <tr>
            <td>${escapeHtml(t.name)}</td>
            <td>${t.difficulty}</td>
            <td>${escapeHtml(t.weightage) || 'N/A'}</td>
            <td>${escapeHtml(t.prep_time) || 'N/A'}</td>
          </tr>
        `;
      });
      printHtml += `</tbody></table></div>`;
    });
    printHtml += `</div>`;
  });

  printHtml += `</body></html>`;
  printWindow.document.write(printHtml);
  printWindow.document.close();
  printWindow.print();
}

// ---------------- ADMIN CRUD MODALS ----------------

// Add Subject Modal
function openAddSubjectSyllabusModal() {
  const examId = document.getElementById('syllabus-exam-select').value;
  const content = `
    <form id="add-subject-form" onsubmit="submitAddSubject(event, ${examId})">
      <div class="form-group">
        <label>Subject Name</label>
        <input type="text" id="add-sub-name" class="glass-input" placeholder="e.g. Quantitative Aptitude" required>
      </div>
      <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:20px;">
        <button type="button" class="glass-btn glass-btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="submit" class="glass-btn">Add Subject</button>
      </div>
    </form>
  `;
  showModal('Add Syllabus Subject', content);
}

async function submitAddSubject(e, examId) {
  e.preventDefault();
  const name = document.getElementById('add-sub-name').value;

  const res = await API.post('/api/syllabus/subject', { examId, name });
  if (res.success) {
    closeModal();
    loadSyllabusForSelectedExam();
  } else {
    alert(res.message);
  }
}

// Add Unit Modal
function openAddUnitSyllabusModal(subjectId) {
  const content = `
    <form id="add-unit-form" onsubmit="submitAddUnit(event, ${subjectId})">
      <div class="form-group">
        <label>Unit Name</label>
        <input type="text" id="add-un-name" class="glass-input" placeholder="e.g. Ratio & Proportion" required>
      </div>
      <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:20px;">
        <button type="button" class="glass-btn glass-btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="submit" class="glass-btn">Add Unit</button>
      </div>
    </form>
  `;
  showModal('Add Syllabus Unit', content);
}

async function submitAddUnit(e, subjectId) {
  e.preventDefault();
  const name = document.getElementById('add-un-name').value;

  const res = await API.post('/api/syllabus/unit', { subjectId, name });
  if (res.success) {
    closeModal();
    loadSyllabusForSelectedExam();
  } else {
    alert(res.message);
  }
}

// Add Topic Modal
function openAddTopicSyllabusModal(unitId) {
  const content = `
    <form id="add-topic-form" onsubmit="submitAddTopic(event, ${unitId})">
      <div class="form-group">
        <label>Topic Statement</label>
        <input type="text" id="add-top-name" class="glass-input" placeholder="e.g. Work and Time formulas" required>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Difficulty</label>
          <select id="add-top-diff" class="glass-input">
            <option value="Easy">Easy</option>
            <option value="Medium" selected>Medium</option>
            <option value="Hard">Hard</option>
          </select>
        </div>
        <div class="form-group">
          <label>Weightage</label>
          <input type="text" id="add-top-weight" class="glass-input" placeholder="e.g. High / 2 MCQs">
        </div>
      </div>
      <div class="form-group">
        <label>Estimated Preparation Time</label>
        <input type="text" id="add-top-time" class="glass-input" placeholder="e.g. 4 Hours">
      </div>

      <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:20px;">
        <button type="button" class="glass-btn glass-btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="submit" class="glass-btn">Add Topic</button>
      </div>
    </form>
  `;
  showModal('Add Syllabus Topic', content);
}

async function submitAddTopic(e, unitId) {
  e.preventDefault();
  const name = document.getElementById('add-top-name').value;
  const difficulty = document.getElementById('add-top-diff').value;
  const weightage = document.getElementById('add-top-weight').value;
  const prep_time = document.getElementById('add-top-time').value;

  const res = await API.post('/api/syllabus/topic', { unitId, name, difficulty, weightage, prep_time });
  if (res.success) {
    closeModal();
    loadSyllabusForSelectedExam();
  } else {
    alert(res.message);
  }
}

// Deletes
async function deleteSyllabusSubject(id) {
  if (confirm('Delete this Subject and all underlying units/topics?')) {
    const res = await API.delete(`/api/syllabus/subject/${id}`);
    if (res.success) loadSyllabusForSelectedExam();
  }
}
async function deleteSyllabusUnit(id) {
  if (confirm('Delete this Unit and all underlying topics?')) {
    const res = await API.delete(`/api/syllabus/unit/${id}`);
    if (res.success) loadSyllabusForSelectedExam();
  }
}
async function deleteSyllabusTopic(id) {
  if (confirm('Delete this Topic?')) {
    const res = await API.delete(`/api/syllabus/topic/${id}`);
    if (res.success) loadSyllabusForSelectedExam();
  }
}
