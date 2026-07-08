let quizQuestions = [];
let currentQuizQuestionIndex = 0;
let activeQuizAnswers = {};
let quizTimerInterval = null;
let quizSecondsRemaining = 0;
let activeExamId = null;

let examsActiveTab = 'mock_tests'; // 'mock_tests' or 'e_content'

// Renders the main Exam Center Panel
async function renderExamsPanel() {
  const container = document.getElementById('active-panel-body');

  container.innerHTML = `
    <div style="margin-bottom: 24px;">
      <h2 style="font-weight: 800;">Exam Preparation Center</h2>
      <p style="color: var(--text-secondary); font-size: 0.9rem;">Test your preparation levels and download reference study guides.</p>
    </div>

    <!-- Panel Tabs -->
    <div class="auth-tabs" style="width: 100%; max-width: 480px; margin-bottom: 20px;">
      <div class="auth-tab ${examsActiveTab === 'mock_tests' ? 'active' : ''}" id="exams-tab-tests" onclick="switchExamsCenterTab('mock_tests')">Mock Test Papers</div>
      <div class="auth-tab ${examsActiveTab === 'e_content' ? 'active' : ''}" id="exams-tab-guides" onclick="switchExamsCenterTab('e_content')">E-Content Study Guides</div>
    </div>

    <!-- Active Sub-tab View container -->
    <div id="exams-tab-view-container"></div>
  `;

  // Render the active tab view
  if (examsActiveTab === 'mock_tests') {
    await renderMockTestsTabView();
  } else {
    await renderEContentTabView();
  }
}

// Switch between mock tests grid and study guides pdf uploader
function switchExamsCenterTab(tabKey) {
  examsActiveTab = tabKey;
  renderExamsPanel();
}

// ---------------- MOCK TESTS VIEW & FILTERING ----------------

let rawExamsList = [];

async function renderMockTestsTabView() {
  const tabContainer = document.getElementById('exams-tab-view-container');
  const role = currentUser.role;

  let createHeader = '';
  if (role === 'admin') {
    createHeader = `
      <div style="display: flex; justify-content: flex-end; margin-bottom: 16px;">
        <button class="glass-btn" onclick="openCreateExamModal()">
          <svg style="width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 2;" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          Create Mock Exam
        </button>
      </div>
    `;
  }

  tabContainer.innerHTML = `
    ${createHeader}

    <!-- Search Controls -->
    <div class="catalog-controls" style="margin-bottom: 24px;">
      <div class="catalog-search-wrapper" style="flex-grow: 1;">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        <input type="text" id="exam-search-input" class="glass-input catalog-search" placeholder="Search by Exam Title, Subject, or Eligibility..." oninput="filterExamsList()">
      </div>
    </div>

    <div class="exams-grid" id="exams-list-container">
      <div class="spinner flex-center" style="margin: 40px auto; grid-column: 1/-1;"></div>
    </div>
  `;

  // Load exams
  const res = await API.get('/api/exams');
  if (res.success) {
    rawExamsList = res.exams || [];
    renderExamsListCards(rawExamsList);
  } else {
    document.getElementById('exams-list-container').innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--text-danger);">Error fetching exams list.</div>';
  }
}

function renderExamsListCards(examsList) {
  const container = document.getElementById('exams-list-container');
  container.innerHTML = '';
  const role = currentUser.role;

  if (examsList.length === 0) {
    container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 48px; color: var(--text-light)">No matching exams found.</div>';
    return;
  }

  examsList.forEach(e => {
    let statsBlock = '';
    let actionBtn = '';
    const attemptsCount = e.attempts_count || 0;

    if (role === 'admin') {
      actionBtn = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
          <button class="glass-btn glass-btn-secondary" style="padding: 10px 8px; font-size: 0.85rem;" onclick="viewExamDetailsDialog(${e.id})">
            Details
          </button>
          <button class="glass-btn glass-btn-danger" style="padding: 10px 8px; font-size: 0.85rem;" onclick="deleteExam(${e.id})">
            Delete
          </button>
        </div>
      `;
    } else if (role === 'student') {
      actionBtn = `
        <div style="display: grid; grid-template-columns: 1fr 1.3fr; gap: 8px;">
          <button class="glass-btn glass-btn-secondary" style="padding: 10px 8px; font-size: 0.85rem;" onclick="viewExamDetailsDialog(${e.id})">
            Details
          </button>
          <button class="glass-btn" style="padding: 10px 8px; font-size: 0.85rem;" onclick="startExamQuiz(${e.id})">
            ${attemptsCount > 0 ? 'Retake' : 'Attempt'}
          </button>
        </div>
      `;
    } else {
      // Librarian
      actionBtn = `
        <button class="glass-btn glass-btn-secondary" style="width: 100%; padding: 10px; font-size: 0.9rem;" onclick="viewExamDetailsDialog(${e.id})">
          View Details & Eligibility
        </button>
      `;
    }

    if (role === 'student') {
      const highScoreStr = e.high_score !== null ? `${e.high_score}/${e.total_marks}` : 'N/A';
      statsBlock = `
        <div style="font-size: 0.8rem; border-top: 1px solid var(--border-color); padding-top: 12px; margin-top: 12px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
          <div>Attempts: <b>${attemptsCount}</b></div>
          <div>High Score: <b>${highScoreStr}</b></div>
        </div>
      `;
    }

    container.innerHTML += `
      <div class="glass-card exam-card fade-in">
        <div>
          <span class="exam-subject badge bg-info-subtle">${escapeHtml(e.subject)}</span>
          <h3 class="exam-title" style="margin-bottom: 8px;">${escapeHtml(e.title)}</h3>
          
          <!-- Eligibility criteria description -->
          <div style="font-size: 0.825rem; color: var(--text-secondary); margin-bottom: 12px; display: flex; align-items: flex-start; gap: 4px;">
            <svg style="width: 14px; height: 14px; flex-shrink: 0; color: var(--accent); margin-top: 2px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
            <span>Eligibility: <b>${escapeHtml(e.eligibility_criteria)}</b></span>
          </div>

          <div class="exam-meta" style="margin-bottom: 0;">
            <div class="exam-meta-item">
              <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              <span>${e.duration_minutes} Mins</span>
            </div>
            <div class="exam-meta-item">
              <svg viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
              <span>${e.total_marks} Marks</span>
            </div>
          </div>
        </div>
        <div>
          ${statsBlock}
          <div style="margin-top: 16px;">
            ${actionBtn}
          </div>
        </div>
      </div>
    `;
  });
}

// Display detailed exam modal guidelines
function viewExamDetailsDialog(examId) {
  const e = rawExamsList.find(item => item.id === examId);
  if (!e) return;

  // Compile syllabus guidelines based on subject
  let syllabus = 'General Aptitude, Core Syllabus questions.';
  if (e.subject.toLowerCase().includes('science')) {
    syllabus = 'General Physics (Resistance, Gravity), Chemistry (Electronegativity, Acids/Bases).';
  } else if (e.subject.toLowerCase().includes('biology')) {
    syllabus = 'Cellular Biology (Mitochondria, Organelles), Human Physiology, General Anatomy.';
  } else if (e.subject.toLowerCase().includes('social') || e.subject.toLowerCase().includes('studies')) {
    syllabus = 'Indian Polity & Constitution, Fundamental Rights, Modern Indian History, Indian Presidents.';
  } else if (e.subject.toLowerCase().includes('computer')) {
    syllabus = 'Sorting Algorithms (Stability, Complexities), Binary Search Trees, OSI Networking Model Layers.';
  } else if (e.subject.toLowerCase().includes('math') || e.subject.toLowerCase().includes('quant')) {
    syllabus = 'Quantitative Aptitude, Logarithmic equations, Time & Distance speed formulas, Algebra.';
  } else if (e.subject.toLowerCase().includes('reasoning') || e.subject.toLowerCase().includes('logic')) {
    syllabus = 'Analytical Reasoning, Blood Relations logic, Missing Number series, Pattern completion.';
  } else if (e.subject.toLowerCase().includes('law')) {
    syllabus = 'Legal Aptitude, Constitutional Law structure, Legal Rights, Judicial age requirements.';
  }

  const content = `
    <div style="text-align: left; padding: 12px 0;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <span class="badge bg-info-subtle" style="font-size: 0.8rem;">${escapeHtml(e.subject)}</span>
        <span style="font-size: 0.85rem; color: var(--text-light);">Created: ${new Date(e.created_at).toLocaleDateString()}</span>
      </div>

      <h4 style="font-size: 1.3rem; font-weight: 700; margin-bottom: 16px; color: var(--accent);">${escapeHtml(e.title)}</h4>

      <div class="result-stat-row" style="margin-bottom: 24px;">
        <div class="result-box">
          <div class="result-box-value">${e.duration_minutes} Mins</div>
          <div class="result-box-label">Duration</div>
        </div>
        <div class="result-box">
          <div class="result-box-value">${e.total_marks} Points</div>
          <div class="result-box-label">Total Weight</div>
        </div>
        <div class="result-box">
          <div class="result-box-value">MCQ</div>
          <div class="result-box-label">Format</div>
        </div>
      </div>

      <!-- Eligibility Section -->
      <div style="margin-bottom: 20px; background: rgba(255,255,255,0.02); padding: 16px; border-radius: var(--radius-sm); border: 1px solid var(--border-color);">
        <h5 style="font-weight: 700; margin-bottom: 8px; color: var(--warning); display: flex; align-items: center; gap: 6px;">
          <svg style="width:16px; height:16px; fill:none; stroke:currentColor; stroke-width:2;" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
          Candidate Eligibility:
        </h5>
        <p style="font-size: 0.925rem; font-weight: 600; line-height: 1.4;">${escapeHtml(e.eligibility_criteria)}</p>
      </div>

      <!-- Syllabus Section -->
      <div style="margin-bottom: 20px;">
        <h5 style="font-weight: 700; margin-bottom: 6px; color: var(--text-secondary);">Syllabus Topics Covered:</h5>
        <p style="font-size: 0.9rem; line-height: 1.5; color: var(--text-primary); font-style: italic;">${syllabus}</p>
      </div>

      <!-- Test Instructions -->
      <div style="margin-bottom: 24px;">
        <h5 style="font-weight: 700; margin-bottom: 8px; color: var(--text-secondary);">Test Regulations:</h5>
        <ul style="font-size: 0.85rem; color: var(--text-secondary); display: flex; flex-direction: column; gap: 6px; padding-left: 12px; list-style-type: decimal;">
          <li>This practice test has strict timer conditions. Leaving the page does not pause the timer.</li>
          <li>Each question displays four options. Choose the most appropriate option.</li>
          <li>Upon completion, click "Submit Exam Sheet". Unanswered questions score 0 points.</li>
          <li>Detailed review keys and download certificates are generated on submit.</li>
        </ul>
      </div>

      <!-- Modal Footer -->
      <div style="display: flex; justify-content: flex-end; gap: 12px; border-top: 1px solid var(--border-color); padding-top: 16px; margin-top: 20px;">
        <button class="glass-btn glass-btn-secondary" onclick="closeModal()">Close Panel</button>
        ${currentUser.role === 'student' ? `
          <button class="glass-btn" onclick="closeModal(); startExamQuiz(${e.id})">
            Start Mock Test
          </button>
        ` : ''}
      </div>
    </div>
  `;

  showModal('Exam Specifications & Guidelines', content);
}

function filterExamsList() {
  const q = document.getElementById('exam-search-input').value.toLowerCase();
  const filtered = rawExamsList.filter(e => {
    return e.title.toLowerCase().includes(q) ||
           e.subject.toLowerCase().includes(q) ||
           (e.eligibility_criteria && e.eligibility_criteria.toLowerCase().includes(q));
  });
  renderExamsListCards(filtered);
}

// ---------------- E-CONTENT STUDY MATERIAL TAB ----------------

async function renderEContentTabView() {
  const tabContainer = document.getElementById('exams-tab-view-container');
  const role = currentUser.role;

  // Render double column: left side is PDF uploader (allowed for student, librarian, admin)
  // Right side is list of PDFs
  tabContainer.innerHTML = `
    <div class="dashboard-split-grid fade-in">
      
      <!-- Left side: PDF Upload Form -->
      <div class="glass-card panel-section">
        <div class="panel-title">Upload Study Guide</div>
        <form id="pdf-upload-form" onsubmit="submitPdfStudyMaterial(event)">
          <div class="form-group">
            <label for="upload-material-title">Guide Title</label>
            <input type="text" id="upload-material-title" class="glass-input" placeholder="e.g. Physics Formula Sheet" required>
          </div>
          <div class="form-group">
            <label for="upload-material-exam">Associate to Mock Exam (Optional)</label>
            <select id="upload-material-exam" class="glass-input" style="cursor: pointer;">
              <option value="null">General Study Guide</option>
            </select>
          </div>
          <div class="form-group" style="margin-bottom: 24px;">
            <label for="upload-material-file">Choose PDF File</label>
            <input type="file" id="upload-material-file" class="glass-input" accept=".pdf" style="padding: 8px 12px; cursor: pointer;" required>
            <span style="font-size: 0.75rem; color: var(--text-light); margin-top: 4px; display: block;">Maximum size: 5MB. PDF format only.</span>
          </div>
          
          <button type="submit" id="pdf-upload-btn" class="glass-btn" style="width: 100%;">
            <span>Upload PDF Document</span>
            <svg style="width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 2;" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
          </button>
        </form>
      </div>

      <!-- Right side: PDF Document Library -->
      <div class="glass-card panel-section">
        <div class="panel-title">E-Content PDF Library</div>
        <div class="glass-table-container" style="max-height: 400px; overflow-y: auto;">
          <table class="glass-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Exam Category</th>
                <th>Uploaded By</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="pdf-study-materials-tbody">
              <tr><td colspan="4" style="text-align: center; color: var(--text-light)">Loading PDF archives...</td></tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  `;

  // Populate Exams Dropdown list in Upload Form
  const examSelect = document.getElementById('upload-material-exam');
  const examsRes = await API.get('/api/exams');
  if (examsRes.success && examsRes.exams) {
    examsRes.exams.forEach(e => {
      examSelect.innerHTML += `<option value="${e.id}">${escapeHtml(e.title)}</option>`;
    });
  }

  // Fetch and display materials table
  await fetchAndRenderPDFList();
}

async function fetchAndRenderPDFList() {
  const tbody = document.getElementById('pdf-study-materials-tbody');
  const res = await API.get('/api/exams/materials');
  tbody.innerHTML = '';

  if (!res.success || !res.materials || res.materials.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 24px; color: var(--text-light)">No PDF guides uploaded yet.</td></tr>';
    return;
  }

  res.materials.forEach(m => {
    const examLabel = m.exam_title ? escapeHtml(m.exam_title) : '<span style="color:var(--text-light)">General</span>';
    const uploadDate = new Date(m.uploaded_at).toLocaleDateString();

    tbody.innerHTML += `
      <tr>
        <td>
          <div style="font-weight: 700;">${escapeHtml(m.title)}</div>
          <div style="font-size: 0.7rem; color: var(--text-light);">Uploaded: ${uploadDate}</div>
        </td>
        <td style="font-size: 0.85rem; max-width: 120px; white-space: nowrap; text-overflow: ellipsis; overflow: hidden;">${examLabel}</td>
        <td style="font-size: 0.85rem;"><b>${escapeHtml(m.uploaded_by_name)}</b></td>
        <td>
          <a href="/uploads/${m.filename}" target="_blank" class="glass-btn" style="padding: 6px 12px; font-size: 0.75rem; background: var(--info); box-shadow: none;">
            Download PDF
          </a>
        </td>
      </tr>
    `;
  });
}

// Submit study material as base64
async function submitPdfStudyMaterial(e) {
  e.preventDefault();

  const title = document.getElementById('upload-material-title').value;
  const examId = document.getElementById('upload-material-exam').value;
  const fileInput = document.getElementById('upload-material-file');
  
  if (fileInput.files.length === 0) {
    alert('Please choose a file to upload.');
    return;
  }

  const file = fileInput.files[0];
  if (file.size > 5 * 1024 * 1024) {
    alert('File size exceeds the 5MB limits.');
    return;
  }

  const submitBtn = document.getElementById('pdf-upload-btn');
  const origHtml = submitBtn.innerHTML;
  submitBtn.disabled = true;
  submitBtn.innerHTML = 'Uploading Base64 File...';

  // Read file as Base64 Data URL
  const reader = new FileReader();
  reader.onload = async () => {
    const fileData = reader.result;

    const payload = {
      title,
      examId,
      filename: file.name,
      fileData
    };

    const res = await API.post('/api/exams/materials/upload', payload);
    if (res.success) {
      alert(res.message || 'PDF Study material uploaded successfully.');
      document.getElementById('pdf-upload-form').reset();
      await fetchAndRenderPDFList();
    } else {
      alert(res.message || 'PDF upload failed.');
    }

    submitBtn.disabled = false;
    submitBtn.innerHTML = origHtml;
  };

  reader.onerror = (error) => {
    console.error('File reading error:', error);
    alert('Failed to read local PDF file.');
    submitBtn.disabled = false;
    submitBtn.innerHTML = origHtml;
  };

  reader.readAsDataURL(file);
}

// ---------------- STUDENT MOCK TEST SIMULATOR ----------------

// Start the quiz taking layout
async function startExamQuiz(examId) {
  const res = await API.get(`/api/exams/${examId}`);
  if (!res.success) {
    alert(res.message || 'Error loading exam questions');
    return;
  }

  const { exam, questions } = res;
  if (!questions || questions.length === 0) {
    alert('This exam does not have any questions seeded yet.');
    return;
  }

  // Set global states
  activeExamId = examId;
  quizQuestions = questions;
  currentQuizQuestionIndex = 0;
  activeQuizAnswers = {};
  quizSecondsRemaining = exam.duration_minutes * 60;

  // Initialize UI labels
  document.getElementById('quiz-portal-exam-title').textContent = exam.title;
  document.getElementById('quiz-portal-exam-meta').textContent = `Subject: ${exam.subject} | Questions: ${questions.length} | Marks: ${exam.total_marks}`;

  // Build Navigator Grid
  const navGrid = document.getElementById('quiz-portal-nav-grid');
  navGrid.innerHTML = '';
  questions.forEach((_, idx) => {
    navGrid.innerHTML += `<div class="nav-num" id="quiz-nav-item-${idx}" onclick="jumpToQuizQuestion(${idx})">${idx + 1}</div>`;
  });

  // Start countdown clock
  updateQuizTimerDisplay();
  if (quizTimerInterval) clearInterval(quizTimerInterval);
  quizTimerInterval = setInterval(() => {
    quizSecondsRemaining--;
    updateQuizTimerDisplay();
    if (quizSecondsRemaining <= 0) {
      clearInterval(quizTimerInterval);
      alert('Time is up! Submitting your answers automatically.');
      submitQuizAnswers(true);
    }
  }, 1000);

  // Render first question
  renderCurrentQuizQuestion();

  // Open overlay
  document.getElementById('active-quiz-portal').classList.add('active');
}

function updateQuizTimerDisplay() {
  const min = Math.floor(quizSecondsRemaining / 60);
  const sec = quizSecondsRemaining % 60;
  const timeStr = `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  document.getElementById('quiz-portal-timer').textContent = timeStr;
  
  if (quizSecondsRemaining < 60) {
    document.querySelector('.exam-timer').style.color = 'var(--danger)';
    document.querySelector('.exam-timer').style.background = 'rgba(239, 68, 68, 0.1)';
  } else {
    document.querySelector('.exam-timer').style.color = 'var(--warning)';
    document.querySelector('.exam-timer').style.background = 'rgba(245, 158, 11, 0.1)';
  }
}

function renderCurrentQuizQuestion() {
  const q = quizQuestions[currentQuizQuestionIndex];
  const container = document.getElementById('quiz-portal-question-card');
  const selectedOption = activeQuizAnswers[q.id] || '';

  // Render question text & options
  container.innerHTML = `
    <div class="question-number">Question ${currentQuizQuestionIndex + 1} of ${quizQuestions.length}</div>
    <div class="question-text">${escapeHtml(q.question_text)}</div>
    <div class="options-list">
      <div class="option-btn ${selectedOption === 'A' ? 'selected' : ''}" onclick="selectQuizOption(${q.id}, 'A')">
        <span class="option-prefix">A</span>
        <span>${escapeHtml(q.option_a)}</span>
      </div>
      <div class="option-btn ${selectedOption === 'B' ? 'selected' : ''}" onclick="selectQuizOption(${q.id}, 'B')">
        <span class="option-prefix">B</span>
        <span>${escapeHtml(q.option_b)}</span>
      </div>
      <div class="option-btn ${selectedOption === 'C' ? 'selected' : ''}" onclick="selectQuizOption(${q.id}, 'C')">
        <span class="option-prefix">C</span>
        <span>${escapeHtml(q.option_c)}</span>
      </div>
      <div class="option-btn ${selectedOption === 'D' ? 'selected' : ''}" onclick="selectQuizOption(${q.id}, 'D')">
        <span class="option-prefix">D</span>
        <span>${escapeHtml(q.option_d)}</span>
      </div>
    </div>
  `;

  // Update Navigator styles
  document.querySelectorAll('.nav-num').forEach(el => el.classList.remove('current'));
  const activeNav = document.getElementById(`quiz-nav-item-${currentQuizQuestionIndex}`);
  if (activeNav) activeNav.classList.add('current');

  // Disable/enable footers
  document.getElementById('quiz-prev-btn').disabled = currentQuizQuestionIndex === 0;
  document.getElementById('quiz-next-btn').disabled = currentQuizQuestionIndex === quizQuestions.length - 1;
}

function selectQuizOption(questionId, optionKey) {
  activeQuizAnswers[questionId] = optionKey;
  renderCurrentQuizQuestion();

  // Mark Navigator box as answered
  const navItem = document.getElementById(`quiz-nav-item-${currentQuizQuestionIndex}`);
  if (navItem) navItem.classList.add('answered');
}

function quizNavigate(direction) {
  if (direction === 'prev' && currentQuizQuestionIndex > 0) {
    currentQuizQuestionIndex--;
  } else if (direction === 'next' && currentQuizQuestionIndex < quizQuestions.length - 1) {
    currentQuizQuestionIndex++;
  }
  renderCurrentQuizQuestion();
}

function jumpToQuizQuestion(idx) {
  currentQuizQuestionIndex = idx;
  renderCurrentQuizQuestion();
}

function confirmQuizSubmit() {
  const answeredCount = Object.keys(activeQuizAnswers).length;
  const unansweredCount = quizQuestions.length - answeredCount;
  
  let confirmMsg = 'Are you sure you want to submit your exam sheet?';
  if (unansweredCount > 0) {
    confirmMsg = `You have ${unansweredCount} unanswered questions left. Are you sure you want to submit?`;
  }

  if (confirm(confirmMsg)) {
    submitQuizAnswers();
  }
}

// Submit score parameters, grade responses, and render breakdown + report print button
async function submitQuizAnswers(autoSubmit = false) {
  if (quizTimerInterval) clearInterval(quizTimerInterval);

  // Close full screen overlay
  document.getElementById('active-quiz-portal').classList.remove('active');

  // Fetch loader spinner
  const container = document.getElementById('active-panel-body');
  container.innerHTML = `
    <div class="flex-center" style="flex-grow: 1; flex-direction: column; gap: 16px;">
      <div class="spinner"></div>
      <p style="color: var(--text-secondary);">Grading your answers sheet...</p>
    </div>
  `;

  const res = await API.post('/api/exams/submit', {
    examId: activeExamId,
    answers: activeQuizAnswers
  });

  if (res.success) {
    const percentage = Math.round((res.correctAnswers / res.totalQuestions) * 100);
    
    // Fetch Exam Titles & Subject from DOM/State
    const examTitle = document.getElementById('quiz-portal-exam-title').textContent;
    const examMetaText = document.getElementById('quiz-portal-exam-meta').textContent;
    const examSubject = examMetaText.split(' | ')[0].replace('Subject: ', '');

    // Compile Question-by-Question Review breakdown
    let reviewHtml = `
      <div style="margin-top: 20px; border-top: 1px solid var(--border-color); padding-top: 16px; max-height: 200px; overflow-y: auto; text-align: left;">
        <h5 style="font-weight: 700; margin-bottom: 12px; color: var(--text-secondary);">Detailed Question Review:</h5>
    `;

    quizQuestions.forEach((q, idx) => {
      const userAns = activeQuizAnswers[q.id] || 'Not Answered';
      const correctAns = res.correctKeys[q.id];
      const isCorrect = userAns.toUpperCase() === correctAns.toUpperCase();

      reviewHtml += `
        <div style="padding: 10px; margin-bottom: 8px; border-radius: var(--radius-sm); border: 1px solid var(--border-color); background: ${isCorrect ? 'rgba(16, 185, 129, 0.04)' : 'rgba(239, 68, 68, 0.04)'};">
          <div style="font-size: 0.8rem; font-weight: 700; color: ${isCorrect ? 'var(--success)' : 'var(--danger)'};">Question ${idx + 1}: ${isCorrect ? '✓ Correct' : '✗ Incorrect'}</div>
          <div style="font-weight: 600; font-size: 0.85rem; margin: 4px 0;">${escapeHtml(q.question_text)}</div>
          <div style="font-size: 0.75rem; color: var(--text-secondary);">Your Selection: <b style="color: ${isCorrect ? 'var(--success)' : 'var(--danger)'};">${userAns}</b> | Correct Option: <b>${correctAns}</b></div>
        </div>
      `;
    });

    reviewHtml += '</div>';

    // Build overall Modal feedback layout
    const scoreHtml = `
      <div style="text-align: center; padding: 12px 0;">
        <div style="width: 100px; height: 100px; border-radius: 50%; background: ${percentage >= 40 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)'}; border: 3px solid ${percentage >= 40 ? 'var(--success)' : 'var(--danger)'}; display: flex; align-items: center; justify-content: center; font-size: 2.2rem; font-weight: 800; color: ${percentage >= 40 ? 'var(--success)' : 'var(--danger)'}; margin: 0 auto 20px auto;">
          ${percentage}%
        </div>
        <h4>Practice Test Graded!</h4>
        <p style="color: var(--text-secondary); margin-top: 8px;">Your score sheet results are as follows:</p>
        
        <div class="result-stat-row" style="margin-top: 16px; margin-bottom: 20px;">
          <div class="result-box">
            <div class="result-box-value" style="color: var(--accent);">${res.score}/${res.totalMarks}</div>
            <div class="result-box-label">Scored Points</div>
          </div>
          <div class="result-box">
            <div class="result-box-value" style="color: var(--success);">${res.correctAnswers}</div>
            <div class="result-box-label">Correct MCQs</div>
          </div>
          <div class="result-box">
            <div class="result-box-value" style="color: var(--text-light);">${res.totalQuestions}</div>
            <div class="result-box-label">Total MCQs</div>
          </div>
        </div>

        <!-- Detailed Review list -->
        ${reviewHtml}

        <div style="display: flex; gap: 12px; margin-top: 24px;">
          <button class="glass-btn glass-btn-secondary" style="flex-grow:1;" onclick="downloadReportCard('${escapeHtml(examTitle)}', '${escapeHtml(examSubject)}', ${res.score}, ${res.totalMarks}, ${res.correctAnswers}, ${res.totalQuestions})">
            <svg style="width:16px; height:16px; fill:none; stroke:currentColor; stroke-width:2; margin-right:4px;" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            Save Report Card
          </button>
          <button class="glass-btn" style="flex-grow:1;" onclick="closeModalAndRefreshExams()">Return to Hub</button>
        </div>
      </div>
    `;

    showModal('Exam Score Sheet', scoreHtml);
  } else {
    alert(res.message || 'Error submitting answers');
    renderExamsPanel();
  }
}

// Generate a clean printable popup layout triggering window.print() (Browser print to PDF)
function downloadReportCard(examTitle, examSubject, score, totalMarks, correctAnswers, totalQuestions) {
  const percentage = Math.round((correctAnswers / totalQuestions) * 100);
  const printWindow = window.open('', '_blank');
  
  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Exam Performance Report Card - ${examTitle}</title>
      <style>
        body {
          font-family: 'Segoe UI', Arial, sans-serif;
          background-color: #f3f4f6;
          padding: 40px;
          margin: 0;
          color: #1f2937;
        }
        .certificate-container {
          background-color: #ffffff;
          max-width: 750px;
          margin: 0 auto;
          padding: 60px;
          border: 12px double #4f46e5;
          border-radius: 8px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.08);
          position: relative;
        }
        .ribbon {
          text-align: center;
          margin-bottom: 30px;
        }
        .ribbon h1 {
          color: #4f46e5;
          font-size: 2.2rem;
          font-weight: 800;
          margin: 0;
          letter-spacing: 1px;
        }
        .ribbon p {
          color: #6b7280;
          font-size: 0.95rem;
          text-transform: uppercase;
          letter-spacing: 2px;
          margin: 5px 0 0 0;
        }
        .score-circle {
          width: 130px;
          height: 130px;
          border-radius: 50%;
          border: 5px solid #10b981;
          background-color: #f0fdf4;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2.6rem;
          font-weight: 800;
          color: #10b981;
          margin: 0 auto 30px auto;
        }
        .score-circle.fail {
          border-color: #ef4444;
          background-color: #fef2f2;
          color: #ef4444;
        }
        .details-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          margin-bottom: 40px;
          background-color: #f9fafb;
          padding: 20px;
          border-radius: 6px;
          border: 1px dashed #e5e7eb;
        }
        .details-col h4 {
          margin: 0 0 8px 0;
          font-size: 0.8rem;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: #9ca3af;
        }
        .details-col p {
          margin: 0 0 6px 0;
          font-size: 1.05rem;
          color: #374151;
        }
        .details-col p b {
          color: #111827;
        }
        .breakdown-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 30px;
        }
        .breakdown-table th {
          background-color: #e5e7eb;
          border: 1px solid #d1d5db;
          padding: 12px;
          font-weight: 700;
          text-align: left;
        }
        .breakdown-table td {
          border: 1px solid #d1d5db;
          padding: 12px;
        }
        .footer-note {
          text-align: center;
          margin-top: 50px;
          border-top: 1px solid #e5e7eb;
          padding-top: 20px;
          color: #9ca3af;
          font-size: 0.85rem;
        }
        .print-btn-overlay {
          text-align: center;
          margin-top: 20px;
        }
        .print-btn {
          background-color: #4f46e5;
          color: #ffffff;
          border: none;
          padding: 12px 30px;
          border-radius: 6px;
          font-size: 1rem;
          font-weight: 700;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        .print-btn:hover {
          background-color: #3730a3;
        }
        @media print {
          body { background-color: #ffffff; padding: 0; }
          .certificate-container { box-shadow: none; border-color: #4f46e5; }
          .print-btn-overlay { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="certificate-container">
        <div class="ribbon">
          <h1>EXAM PERFORMANCE STATEMENT</h1>
          <p>Mock Quiz Evaluation Center</p>
        </div>

        <div class="score-circle ${percentage >= 40 ? '' : 'fail'}">${percentage}%</div>

        <div class="details-grid">
          <div class="details-col">
            <h4>Student Credentials</h4>
            <p>Name: <b>${escapeHtml(currentUser.full_name)}</b></p>
            <p>Username: <b>${escapeHtml(currentUser.username)}</b></p>
            <p>Email: <b>${escapeHtml(currentUser.email)}</b></p>
          </div>
          <div class="details-col">
            <h4>Mock Exam Metrics</h4>
            <p>Test Title: <b>${escapeHtml(examTitle)}</b></p>
            <p>Subject Category: <b>${escapeHtml(examSubject)}</b></p>
            <p>Evaluation Date: <b>${new Date().toLocaleDateString()}</b></p>
          </div>
        </div>

        <table class="breakdown-table">
          <thead>
            <tr>
              <th>Evaluation Parameter</th>
              <th>Scored Outcome</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>Total MCQs Evaluated</td><td><b>${totalQuestions}</b></td></tr>
            <tr><td>Correct MCQ Submissions</td><td><span style="color:#10b981; font-weight:700;">${correctAnswers}</span></td></tr>
            <tr><td>Incorrect MCQ Submissions</td><td><span style="color:#ef4444; font-weight:700;">${totalQuestions - correctAnswers}</span></td></tr>
            <tr><td>Performance Grade</td><td><b>${percentage >= 75 ? 'Distinction' : percentage >= 40 ? 'Pass' : 'Requires Preparation'}</b></td></tr>
            <tr style="background-color: #f3f4f6; font-size:1.1rem;">
              <td><b>Cumulative Final Score</b></td>
              <td><b style="color:#4f46e5;">${score} / ${totalMarks} Points</b></td>
            </tr>
          </tbody>
        </table>

        <div class="footer-note">
          <p>Generated officially by Competitive Prep & Library Portal. Fully authenticated digital score record.</p>
        </div>
      </div>

      <div class="print-btn-overlay">
        <button class="print-btn" onclick="window.print()">Print / Download PDF</button>
      </div>
    </body>
    </html>
  `);
  
  printWindow.document.close();
}

function closeModalAndRefreshExams() {
  closeModal();
  refreshDashboardStats().then(() => {
    if (currentPanel === 'exams') renderExamsPanel();
    else selectMenuPanel('dashboard');
  });
}

// Admin delete Exam Action
async function deleteExam(examId) {
  if (confirm('WARNING: Are you sure you want to delete this exam? All questions and student attempts will be deleted permanently.')) {
    const res = await API.delete(`/api/exams/${examId}`);
    if (res.success) {
      alert(res.message || 'Exam deleted successfully');
      renderExamsPanel();
    } else {
      alert(res.message || 'Error deleting exam');
    }
  }
}

// Admin: Open dialog to construct new exam
function openCreateExamModal() {
  const content = `
    <form id="create-exam-form" onsubmit="submitCreatedExam(event)">
      <div class="form-group">
        <label for="new-exam-title">Exam Title</label>
        <input type="text" id="new-exam-title" class="glass-input" placeholder="e.g. UPSC Geography Practice Paper" required>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label for="new-exam-subject">Subject</label>
          <input type="text" id="new-exam-subject" class="glass-input" placeholder="Geography" required>
        </div>
        <div class="form-group">
          <label for="new-exam-duration">Duration (Minutes)</label>
          <input type="number" id="new-exam-duration" class="glass-input" value="10" min="1" required>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label for="new-exam-marks">Total Marks</label>
          <input type="number" id="new-exam-marks" class="glass-input" value="30" min="10" step="5" required>
        </div>
        <div class="form-group">
          <label for="new-exam-eligibility">Eligibility Criteria</label>
          <input type="text" id="new-exam-eligibility" class="glass-input" placeholder="e.g. Science students" value="Open to all students" required>
        </div>
      </div>

      <div style="border-top: 1px solid var(--border-color); padding-top: 16px; margin-top: 24px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <h4 style="font-weight: 700;">Exam Questions</h4>
          <button type="button" class="glass-btn glass-btn-secondary" style="padding: 6px 12px; font-size: 0.8rem;" onclick="addQuestionFieldsToModal()">
            + Add MCQ
          </button>
        </div>
        
        <div id="questions-forms-list" style="max-height: 200px; overflow-y: auto; padding-right: 4px; display: flex; flex-direction: column; gap: 16px;">
          <!-- Questions inputs appended here -->
        </div>
      </div>

      <div style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 24px; border-top: 1px solid var(--border-color); padding-top: 16px;">
        <button type="button" class="glass-btn glass-btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="submit" class="glass-btn">Save Mock Exam</button>
      </div>
    </form>
  `;

  showModal('Create Mock Test Paper', content);
  addQuestionFieldsToModal();
}

let newExamQuestionCount = 0;

function addQuestionFieldsToModal() {
  const container = document.getElementById('questions-forms-list');
  newExamQuestionCount++;

  const div = document.createElement('div');
  div.className = 'glass-card question-form-subcard';
  div.id = `q-card-${newExamQuestionCount}`;
  div.style.padding = '16px';
  div.style.position = 'relative';
  div.innerHTML = `
    <button type="button" style="position: absolute; top: 8px; right: 8px; background: transparent; border: none; font-size: 1.25rem; color: var(--danger); cursor: pointer;" onclick="removeQuestionCard(${newExamQuestionCount})">&times;</button>
    <div style="font-size: 0.85rem; font-weight: 700; color: var(--accent); margin-bottom: 8px;">Question #${newExamQuestionCount}</div>
    <div class="form-group">
      <input type="text" class="glass-input q-text" placeholder="Enter question statement" required>
    </div>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
      <input type="text" class="glass-input q-opt-a" placeholder="Option A" required>
      <input type="text" class="glass-input q-opt-b" placeholder="Option B" required>
      <input type="text" class="glass-input q-opt-c" placeholder="Option C" required>
      <input type="text" class="glass-input q-opt-d" placeholder="Option D" required>
    </div>
    <div class="form-group" style="margin-top: 8px; margin-bottom: 0;">
      <label style="font-size: 0.8rem; margin-bottom: 4px;">Correct Answer Option</label>
      <select class="glass-input q-correct" style="padding: 8px 12px; cursor: pointer;">
        <option value="A">A</option>
        <option value="B">B</option>
        <option value="C">C</option>
        <option value="D">D</option>
      </select>
    </div>
  `;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function removeQuestionCard(id) {
  const card = document.getElementById(`q-card-${id}`);
  if (card) card.remove();
}

async function submitCreatedExam(e) {
  e.preventDefault();

  const title = document.getElementById('new-exam-title').value;
  const subject = document.getElementById('new-exam-subject').value;
  const duration_minutes = parseInt(document.getElementById('new-exam-duration').value, 10);
  const total_marks = parseInt(document.getElementById('new-exam-marks').value, 10);
  const eligibility_criteria = document.getElementById('new-exam-eligibility').value;

  // Compile questions
  const questions = [];
  const questionCards = document.querySelectorAll('.question-form-subcard');
  
  questionCards.forEach(card => {
    const question_text = card.querySelector('.q-text').value;
    const option_a = card.querySelector('.q-opt-a').value;
    const option_b = card.querySelector('.q-opt-b').value;
    const option_c = card.querySelector('.q-opt-c').value;
    const option_d = card.querySelector('.q-opt-d').value;
    const correct_option = card.querySelector('.q-correct').value;

    questions.push({
      question_text,
      option_a,
      option_b,
      option_c,
      option_d,
      correct_option
    });
  });

  if (questions.length === 0) {
    alert('Please add at least one question to the exam.');
    return;
  }

  const payload = {
    title,
    subject,
    duration_minutes,
    total_marks,
    eligibility_criteria,
    questions
  };

  const res = await API.post('/api/exams', payload);
  if (res.success) {
    alert(res.message || 'Mock test created successfully.');
    closeModal();
    renderExamsPanel();
  } else {
    alert(res.message || 'Error creating mock test.');
  }
}
