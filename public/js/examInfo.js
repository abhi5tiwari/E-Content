let rawCompetitiveExams = [];
let competitiveCategories = [];

// Panel entry point for Competitive Exams view
async function renderCompetitiveExamsPanel() {
  const container = document.getElementById('active-panel-body');
  const role = currentUser.role;

  container.innerHTML = `
    <div style="margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
      <div>
        <h2 style="font-weight: 800;">Competitive Examinations Directory</h2>
        <p style="color: var(--text-secondary); font-size: 0.9rem;">Browse exam timelines, eligibility criteria, conducting bodies, and syllabus overviews.</p>
      </div>
      ${role === 'admin' ? `
        <button class="glass-btn" onclick="openCreateCompetitiveExamModal()">
          <svg style="width:16px; height:16px; fill:none; stroke:currentColor; stroke-width:2; margin-right:4px;" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          Add Competitive Exam
        </button>
      ` : ''}
    </div>

    <!-- Search Controls Grid -->
    <div class="catalog-controls" style="margin-bottom: 24px;">
      <div class="catalog-search-wrapper" style="flex-grow: 1;">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        <input type="text" id="comp-exam-search" class="glass-input catalog-search" placeholder="Search by Exam Name, conducting body..." oninput="filterCompetitiveExams()">
      </div>
      <select id="comp-exam-category-filter" class="glass-input catalog-filter" onchange="filterCompetitiveExams()" style="cursor: pointer; max-width: 220px;">
        <option value="all">All Categories</option>
      </select>
      <select id="comp-exam-qualification-filter" class="glass-input catalog-filter" onchange="filterCompetitiveExams()" style="cursor: pointer; max-width: 220px;">
        <option value="all">All Qualifications</option>
        <option value="Graduate">Graduate</option>
        <option value="12th">Class 12th</option>
        <option value="10th">Class 10th</option>
        <option value="Engineering">Engineering Degree</option>
        <option value="Medical">Medical Degree</option>
        <option value="Law">Law Degree</option>
      </select>
    </div>

    <div class="exams-grid" id="competitive-exams-grid-container">
      <div class="spinner flex-center" style="margin: 40px auto; grid-column: 1/-1;"></div>
    </div>
  `;

  await fetchCompetitiveExamsList();
}

async function fetchCompetitiveExamsList() {
  const res = await API.get('/api/competitive-exams');
  if (res.success) {
    rawCompetitiveExams = res.exams || [];
    competitiveCategories = res.categories || [];

    // Populate category dropdown
    const catSelect = document.getElementById('comp-exam-category-filter');
    catSelect.innerHTML = '<option value="all">All Categories</option>';
    competitiveCategories.forEach(c => {
      catSelect.innerHTML += `<option value="${c.id}">${escapeHtml(c.name)}</option>`;
    });

    renderCompetitiveExamsGrid(rawCompetitiveExams);
  } else {
    document.getElementById('competitive-exams-grid-container').innerHTML = '<div style="grid-column:1/-1; text-align:center; color:var(--text-danger)">Error loading competitive exams profiles.</div>';
  }
}

function renderCompetitiveExamsGrid(list) {
  const grid = document.getElementById('competitive-exams-grid-container');
  grid.innerHTML = '';

  if (list.length === 0) {
    grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 48px; color: var(--text-light)">No competitive exams found.</div>';
    return;
  }

  list.forEach(e => {
    grid.innerHTML += `
      <div class="glass-card exam-card fade-in">
        <div>
          <span class="exam-subject badge bg-info-subtle">${escapeHtml(e.category_name)}</span>
          <h3 class="exam-title" style="margin-bottom: 6px;">${escapeHtml(e.name)}</h3>
          <p style="font-size: 0.8rem; color: var(--text-light); margin-bottom: 12px;">Authority: <b>${escapeHtml(e.conducting_authority)}</b></p>
          
          <p style="font-size: 0.85rem; line-height: 1.4; color: var(--text-secondary); margin-bottom: 16px; min-height: 40px; text-overflow: ellipsis; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">
            ${escapeHtml(e.short_description)}
          </p>

          <div style="font-size: 0.8rem; display: flex; flex-direction: column; gap: 6px; border-top: 1px solid var(--border-color); padding-top: 12px;">
            <div>Eligibility: <b>${escapeHtml(e.educational_qualification)}</b></div>
            <div>Age Limit: <b>${escapeHtml(e.age_limit)}</b></div>
            <div>Salary Scale: <b>${escapeHtml(e.salary)}</b></div>
          </div>
        </div>

        <div style="margin-top: 16px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
          <button class="glass-btn" style="padding: 8px;" onclick="viewCompetitiveExamDetails(${e.id})">View Info</button>
          <button class="glass-btn glass-btn-secondary" style="padding: 8px;" onclick="navigateToSyllabusTracker(${e.id})">Syllabus</button>
        </div>
      </div>
    `;
  });
}

function filterCompetitiveExams() {
  const queryVal = document.getElementById('comp-exam-search').value.toLowerCase();
  const categoryFilter = document.getElementById('comp-exam-category-filter').value;
  const qualFilter = document.getElementById('comp-exam-qualification-filter').value;

  const filtered = rawCompetitiveExams.filter(e => {
    const matchesSearch = e.name.toLowerCase().includes(queryVal) || e.conducting_authority.toLowerCase().includes(queryVal);
    const matchesCategory = categoryFilter === 'all' || e.category_id.toString() === categoryFilter;
    const matchesQual = qualFilter === 'all' || e.educational_qualification.toLowerCase().includes(qualFilter.toLowerCase());
    return matchesSearch && matchesCategory && matchesQual;
  });

  renderCompetitiveExamsGrid(filtered);
}

function navigateToSyllabusTracker(examId) {
  selectMenuPanel('syllabus');
  // Trigger loading syllabus in syllabus panel (syllabus.js) after short delay
  setTimeout(() => {
    const selector = document.getElementById('syllabus-exam-select');
    if (selector) {
      selector.value = examId;
      loadSyllabusForSelectedExam();
    }
  }, 100);
}

// Display detailed exam modal info
async function viewCompetitiveExamDetails(id) {
  const res = await API.get(`/api/competitive-exams/${id}`);
  if (!res.success) {
    alert('Error fetching exam profile details');
    return;
  }

  const e = res.exam;
  const role = currentUser.role;
  let parsedFaq = [];
  try {
    parsedFaq = JSON.parse(e.faq) || [];
  } catch (err) {
    parsedFaq = [];
  }

  let faqHtml = '';
  if (parsedFaq.length > 0) {
    faqHtml += '<div style="margin-top:20px;"><h5 style="font-weight:700; color:var(--text-secondary);">Frequently Asked Questions (FAQ)</h5>';
    parsedFaq.forEach(f => {
      faqHtml += `
        <div style="margin-bottom: 12px; border-bottom: 1px dashed var(--border-color); padding-bottom: 8px;">
          <div style="font-weight: 700; font-size: 0.85rem; color: var(--accent);">Q: ${escapeHtml(f.question)}</div>
          <div style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 4px;">A: ${escapeHtml(f.answer)}</div>
        </div>
      `;
    });
    faqHtml += '</div>';
  }

  const content = `
    <div style="text-align: left; max-height: 460px; overflow-y: auto; padding-right: 6px;">
      
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
        <span class="badge bg-info-subtle">${escapeHtml(e.category_name)}</span>
        <span>Conducting Body: <b>${escapeHtml(e.conducting_authority)}</b></span>
      </div>

      <h3 style="font-size: 1.4rem; font-weight: 800; color: var(--accent); margin-bottom: 16px;">${escapeHtml(e.name)}</h3>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; background: rgba(255,255,255,0.02); padding: 14px; border-radius: var(--radius-sm); border: 1px solid var(--border-color); font-size: 0.85rem; line-height: 1.5;">
        <div>
          <div>Level: <b>${escapeHtml(e.level)}</b></div>
          <div>Application Fee: <b>${escapeHtml(e.application_fee)}</b></div>
          <div>Admit Card Status: <span class="badge bg-warning-subtle">${escapeHtml(e.admit_card_status || 'Released')}</span></div>
          <div>Result Status: <span class="badge bg-success-subtle">${escapeHtml(e.result_status || 'Awaited')}</span></div>
        </div>
        <div>
          <div>Official Website: <a href="${escapeHtml(e.official_website)}" target="_blank" style="color:var(--info); word-break:break-all;">${escapeHtml(e.official_website)}</a></div>
          <div>Number of Attempts: <b>${escapeHtml(e.num_attempts || 'No limits')}</b></div>
          <div>Important Dates: <b>${escapeHtml(e.important_dates || 'Check official site')}</b></div>
        </div>
      </div>

      <!-- Eligibility requirements -->
      <div style="margin-bottom: 16px;">
        <h5 style="font-weight: 700; color: var(--warning); margin-bottom: 4px;">Eligibility & Qualification:</h5>
        <p style="font-size: 0.9rem; line-height: 1.4;">${escapeHtml(e.eligibility)} &bull; Age Limit: <b>${escapeHtml(e.age_limit)}</b></p>
      </div>

      <!-- Exam Pattern -->
      <div style="margin-bottom: 16px;">
        <h5 style="font-weight: 700; color: var(--text-secondary); margin-bottom: 4px;">Exam Pattern & Selection Process:</h5>
        <p style="font-size: 0.85rem; line-height: 1.5;">${escapeHtml(e.exam_pattern)} <br> Selection Process: <b>${escapeHtml(e.selection_process)}</b></p>
      </div>

      <!-- Salary & Growth -->
      <div style="margin-bottom: 16px;">
        <h5 style="font-weight: 700; color: var(--text-secondary); margin-bottom: 4px;">Salary & Career Growth:</h5>
        <p style="font-size: 0.85rem; line-height: 1.5;">Job Profile: <b>${escapeHtml(e.job_profile)}</b> <br> Career Scale: ${escapeHtml(e.career_growth)} &bull; Promotion Path: ${escapeHtml(e.promotion)}</p>
      </div>

      <!-- Syllabus & Prep -->
      <div style="margin-bottom: 16px;">
        <h5 style="font-weight: 700; color: var(--text-secondary); margin-bottom: 4px;">Syllabus Overview & Previous Cutoffs:</h5>
        <p style="font-size: 0.85rem; line-height: 1.5;">Subjects: <b>${escapeHtml(e.subjects)}</b> <br> Syllabus Summary: ${escapeHtml(e.syllabus_overview)} <br> Previous Cutoff Marks: <b>${escapeHtml(e.cutoff_previous_year)}</b></p>
      </div>

      <!-- Preparation Tips -->
      <div style="margin-bottom: 16px;">
        <h5 style="font-weight: 700; color: var(--success); margin-bottom: 4px;">Preparation Strategy Tips:</h5>
        <p style="font-size: 0.85rem; line-height: 1.4; color: var(--text-secondary); font-style: italic;">"${escapeHtml(e.preparation_tips)}"</p>
      </div>

      <!-- FAQs -->
      ${faqHtml}

      <!-- Footer Buttons -->
      <div style="display: flex; justify-content: flex-end; gap: 12px; border-top: 1px solid var(--border-color); padding-top: 16px; margin-top: 24px;">
        <button class="glass-btn glass-btn-secondary" onclick="closeModal()">Close Info</button>
        ${role === 'admin' ? `
          <button class="glass-btn glass-btn-secondary" onclick="openEditCompetitiveExamModal(${e.id})">Edit Profile</button>
          <button class="glass-btn glass-btn-danger" onclick="deleteCompetitiveExam(${e.id})">Delete Profile</button>
        ` : ''}
        <button class="glass-btn" onclick="closeModal(); navigateToSyllabusTracker(${e.id})">Track Syllabus Progress</button>
      </div>
    </div>
  `;

  showModal('Competitive Exam Profile Statement', content);
}

// Admin: delete competitive exam profile
async function deleteCompetitiveExam(id) {
  if (confirm('WARNING: Are you sure you want to delete this exam profile? All syllabus subjects and units will be deleted.')) {
    const res = await API.delete(`/api/competitive-exams/${id}`);
    if (res.success) {
      alert(res.message);
      closeModal();
      renderCompetitiveExamsPanel();
    } else {
      alert(res.message);
    }
  }
}

// Admin modals for creating exam profile
function openCreateCompetitiveExamModal() {
  const content = `
    <form id="create-comp-exam-form" onsubmit="submitCreatedCompetitiveExam(event)">
      <div class="form-group">
        <label>Exam Name</label>
        <input type="text" id="add-comp-name" class="glass-input" placeholder="e.g. Union Public Service Commission (CSE)" required>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Category</label>
          <select id="add-comp-category" class="glass-input" required>
            ${competitiveCategories.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Conducting Authority</label>
          <input type="text" id="add-comp-authority" class="glass-input" placeholder="UPSC" required>
        </div>
      </div>

      <div class="form-group">
        <label>Short Description</label>
        <textarea id="add-comp-desc" class="glass-input" rows="2" placeholder="Brief details about job posts..."></textarea>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>Official Website</label>
          <input type="url" id="add-comp-site" class="glass-input" placeholder="https://upsc.gov.in" value="https://">
        </div>
        <div class="form-group">
          <label>National/State Level</label>
          <select id="add-comp-level" class="glass-input">
            <option value="National">National Level</option>
            <option value="State">State Level</option>
          </select>
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>Educational Qualification</label>
          <input type="text" id="add-comp-qual" class="glass-input" placeholder="Graduate in any discipline" required>
        </div>
        <div class="form-group">
          <label>Age Limit</label>
          <input type="text" id="add-comp-age" class="glass-input" placeholder="21 - 32 years" required>
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>Salary (Starting Scale)</label>
          <input type="text" id="add-comp-salary" class="glass-input" placeholder="INR 56,100 per month" required>
        </div>
        <div class="form-group">
          <label>Application Fee</label>
          <input type="text" id="add-comp-fee" class="glass-input" placeholder="INR 100 for General">
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>Exam Pattern</label>
          <input type="text" id="add-comp-pattern" class="glass-input" placeholder="3 Stages: Prelims, Mains, Interview">
        </div>
        <div class="form-group">
          <label>Selection Process</label>
          <input type="text" id="add-comp-selection" class="glass-input" placeholder="Written Test followed by Personality Interview">
        </div>
      </div>

      <div style="display: flex; justify-content: flex-end; gap: 12px; border-top:1px solid var(--border-color); padding-top:16px; margin-top:20px;">
        <button type="button" class="glass-btn glass-btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="submit" class="glass-btn">Save Exam Profile</button>
      </div>
    </form>
  `;
  showModal('Add Competitive Exam Profile', content);
}

async function submitCreatedCompetitiveExam(e) {
  e.preventDefault();
  
  const payload = {
    name: document.getElementById('add-comp-name').value,
    category_id: document.getElementById('add-comp-category').value,
    conducting_authority: document.getElementById('add-comp-authority').value,
    short_description: document.getElementById('add-comp-desc').value,
    official_website: document.getElementById('add-comp-site').value,
    level: document.getElementById('add-comp-level').value,
    educational_qualification: document.getElementById('add-comp-qual').value,
    age_limit: document.getElementById('add-comp-age').value,
    salary: document.getElementById('add-comp-salary').value,
    application_fee: document.getElementById('add-comp-fee').value,
    exam_pattern: document.getElementById('add-comp-pattern').value,
    selection_process: document.getElementById('add-comp-selection').value,
    // defaults for hidden ones
    eligibility: 'General rules as defined by body.',
    num_attempts: '6 Attempts',
    syllabus_overview: 'Syllabus parameters outline subjects details.',
    subjects: 'General English, General Knowledge.',
    cutoff_previous_year: 'Check official notifications',
    job_profile: 'Officer level posts',
    career_growth: 'Departmental scales',
    promotion: 'Subject to performance',
    preparation_tips: 'Make self notes and attempt daily mocks.',
    important_dates: 'TBA',
    admit_card_status: 'Awaited',
    result_status: 'Awaited',
    faq: '[]'
  };

  const res = await API.post('/api/competitive-exams', payload);
  if (res.success) {
    alert(res.message || 'Exam profile created successfully.');
    closeModal();
    renderCompetitiveExamsPanel();
  } else {
    alert(res.message || 'Error creating exam profile.');
  }
}

// Edit exam profile form
async function openEditCompetitiveExamModal(id) {
  const res = await API.get(`/api/competitive-exams/${id}`);
  if (!res.success) return;
  const exam = res.exam;

  const content = `
    <form id="edit-comp-exam-form" onsubmit="submitUpdatedCompetitiveExam(event, ${exam.id})">
      <div class="form-group">
        <label>Exam Name</label>
        <input type="text" id="edit-comp-name" class="glass-input" value="${escapeHtml(exam.name)}" required>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Category</label>
          <select id="edit-comp-category" class="glass-input" required>
            ${competitiveCategories.map(c => `<option value="${c.id}" ${c.id === exam.category_id ? 'selected' : ''}>${escapeHtml(c.name)}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Conducting Authority</label>
          <input type="text" id="edit-comp-authority" class="glass-input" value="${escapeHtml(exam.conducting_authority)}" required>
        </div>
      </div>

      <div class="form-group">
        <label>Short Description</label>
        <textarea id="edit-comp-desc" class="glass-input" rows="2">${escapeHtml(exam.short_description)}</textarea>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>Official Website</label>
          <input type="url" id="edit-comp-site" class="glass-input" value="${escapeHtml(exam.official_website)}">
        </div>
        <div class="form-group">
          <label>National/State Level</label>
          <select id="edit-comp-level" class="glass-input">
            <option value="National" ${exam.level === 'National' ? 'selected' : ''}>National Level</option>
            <option value="State" ${exam.level === 'State' ? 'selected' : ''}>State Level</option>
          </select>
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>Educational Qualification</label>
          <input type="text" id="edit-comp-qual" class="glass-input" value="${escapeHtml(exam.educational_qualification)}" required>
        </div>
        <div class="form-group">
          <label>Age Limit</label>
          <input type="text" id="edit-comp-age" class="glass-input" value="${escapeHtml(exam.age_limit)}" required>
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>Salary Scale</label>
          <input type="text" id="edit-comp-salary" class="glass-input" value="${escapeHtml(exam.salary)}" required>
        </div>
        <div class="form-group">
          <label>Application Fee</label>
          <input type="text" id="edit-comp-fee" class="glass-input" value="${escapeHtml(exam.application_fee)}">
        </div>
      </div>

      <div style="display: flex; justify-content: flex-end; gap: 12px; border-top:1px solid var(--border-color); padding-top:16px; margin-top:20px;">
        <button type="button" class="glass-btn glass-btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="submit" class="glass-btn">Save Changes</button>
      </div>
    </form>
  `;
  showModal('Edit Competitive Exam Profile', content);
}

async function submitUpdatedCompetitiveExam(e, id) {
  e.preventDefault();
  
  const payload = {
    name: document.getElementById('edit-comp-name').value,
    category_id: document.getElementById('edit-comp-category').value,
    conducting_authority: document.getElementById('edit-comp-authority').value,
    short_description: document.getElementById('edit-comp-desc').value,
    official_website: document.getElementById('edit-comp-site').value,
    level: document.getElementById('edit-comp-level').value,
    educational_qualification: document.getElementById('edit-comp-qual').value,
    age_limit: document.getElementById('edit-comp-age').value,
    salary: document.getElementById('edit-comp-salary').value,
    application_fee: document.getElementById('edit-comp-fee').value
  };

  const res = await API.put(`/api/competitive-exams/${id}`, payload);
  if (res.success) {
    alert(res.message || 'Exam profile updated successfully.');
    closeModal();
    renderCompetitiveExamsPanel();
  } else {
    alert(res.message || 'Error updating exam profile.');
  }
}
