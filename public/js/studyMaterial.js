let rawStudyMaterials = [];

// Panel entry point for Study Guides
async function renderStudyMaterialsPanel() {
  const container = document.getElementById('active-panel-body');
  const role = currentUser.role;

  container.innerHTML = `
    <div style="margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
      <div>
        <h2 style="font-weight: 800;">Digital Notes & Study Guides</h2>
        <p style="color: var(--text-secondary); font-size: 0.9rem;">Access, rate, and download formula sheets, handwritten notes, syllabus guides, and e-books.</p>
      </div>
    </div>

    <div class="dashboard-split-grid fade-in" style="grid-template-columns: 1.4fr 1fr; gap: 24px; align-items: start;">
      
      <!-- Left Column: Search Filters & Catalog Cards List -->
      <div>
        <div class="catalog-controls" style="margin-bottom: 20px; display: flex; flex-direction: column; gap: 12px; width: 100%;">
          <div style="display: flex; gap: 12px; width: 100%;">
            <div class="catalog-search-wrapper" style="flex-grow: 1;">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              <input type="text" id="notes-search-input" class="glass-input catalog-search" placeholder="Search study materials..." oninput="filterStudyMaterials()">
            </div>
            <select id="notes-sort-select" class="glass-input catalog-filter" onchange="fetchStudyMaterials()" style="cursor: pointer; max-width: 150px;">
              <option value="recent">Recent</option>
              <option value="downloads">Downloads</option>
              <option value="rating">Top Rated</option>
            </select>
          </div>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px;">
            <select id="notes-category-select" class="glass-input catalog-filter" onchange="filterStudyMaterials()" style="cursor: pointer; padding: 10px;">
              <option value="all">All Categories</option>
              <option value="PDF Notes">PDF Notes</option>
              <option value="Handwritten Notes">Handwritten Notes</option>
              <option value="Formula Sheets">Formula Sheets</option>
              <option value="Short Notes">Short Notes</option>
              <option value="E-books">E-books</option>
              <option value="Question Banks">Question Banks</option>
              <option value="Previous Year Papers">Previous Year Papers</option>
              <option value="Practice Sets">Practice Sets</option>
              <option value="Mind Maps">Mind Maps</option>
              <option value="Current Affairs">Current Affairs</option>
            </select>
            <select id="notes-exam-select" class="glass-input catalog-filter" onchange="loadNotesSubjectsSelectFilter(); filterStudyMaterials();" style="cursor: pointer; padding: 10px;">
              <option value="all">All Exams</option>
            </select>
            <select id="notes-subject-select" class="glass-input catalog-filter" onchange="filterStudyMaterials()" style="cursor: pointer; padding: 10px;">
              <option value="all">All Subjects</option>
            </select>
          </div>
        </div>

        <div id="study-materials-cards-grid" style="display: flex; flex-direction: column; gap: 16px;">
          <div class="spinner flex-center" style="margin: 40px auto;"></div>
        </div>
      </div>

      <!-- Right Column: Upload Form & Storage Stats Widget -->
      <div style="display: flex; flex-direction: column; gap: 24px; position: sticky; top: 20px;">
        
        <!-- Upload study material widget (students, librarians, admin all allowed) -->
        <div class="glass-card panel-section">
          <div class="panel-title">Upload Reference Material</div>
          <form id="study-material-upload-form" onsubmit="submitCentralizedNotesUpload(event)" enctype="multipart/form-data">
            <div class="form-group">
              <label>Guide Title</label>
              <input type="text" id="upload-notes-title" class="glass-input" placeholder="e.g. Integration Tricks Sheet" required>
            </div>
            
            <div class="form-row">
              <div class="form-group">
                <label>Category</label>
                <select id="upload-notes-category" class="glass-input" style="cursor: pointer;" required>
                  <option value="PDF Notes">PDF Notes</option>
                  <option value="Handwritten Notes">Handwritten Notes</option>
                  <option value="Formula Sheets">Formula Sheets</option>
                  <option value="Short Notes">Short Notes</option>
                  <option value="E-books">E-books</option>
                  <option value="Question Banks">Question Banks</option>
                  <option value="Previous Year Papers">Previous Year Papers</option>
                  <option value="Practice Sets">Practice Sets</option>
                  <option value="Mind Maps">Mind Maps</option>
                  <option value="Current Affairs">Current Affairs</option>
                </select>
              </div>
              <div class="form-group">
                <label>Linked Exam</label>
                <select id="upload-notes-exam" class="glass-input" style="cursor: pointer;" onchange="loadUploadNotesSubjectsDropdown()">
                  <option value="null">General Guide</option>
                </select>
              </div>
            </div>

            <div class="form-group" id="upload-notes-subject-wrapper" style="display: none;">
              <label>Linked Subject</label>
              <select id="upload-notes-subject" class="glass-input" style="cursor: pointer;">
                <option value="null">Select Subject</option>
              </select>
            </div>

            <div class="form-group">
              <label>Choose File (PDF, DOCX, ZIP, PPTX...)</label>
              <input type="file" id="upload-notes-file" class="glass-input" style="padding: 8px 12px; cursor: pointer;" required>
              <span style="font-size: 0.725rem; color: var(--text-light); margin-top: 4px; display: block;">Maximum size: 10MB. Files logged with timestamp.</span>
            </div>

            <div id="upload-progress-container" class="hidden" style="margin-bottom: 16px;">
              <div style="display: flex; justify-content: space-between; font-size: 0.75rem; margin-bottom: 4px;">
                <span>Uploading file...</span>
                <span id="upload-progress-percent">0%</span>
              </div>
              <div style="background: rgba(255,255,255,0.05); height: 6px; border-radius: 3px; overflow: hidden;">
                <div id="upload-progress-fill" style="width: 0%; height: 100%; background: var(--accent); transition: width 0.1s ease;"></div>
              </div>
            </div>

            <button type="submit" class="glass-btn" style="width: 100%;">Upload Document</button>
          </form>
        </div>

        <!-- Storage Statistics widget -->
        <div class="glass-card panel-section">
          <div class="panel-title">Server Storage Statistics</div>
          <div style="display: flex; justify-content: space-between; font-size: 0.9rem; margin-bottom: 8px;">
            <span>Total Guides Uploaded:</span>
            <b id="storage-total-files">0 Files</b>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 0.9rem;">
            <span>Cumulative Storage Size:</span>
            <b id="storage-total-bytes">0 MB</b>
          </div>
        </div>

      </div>

    </div>
  `;

  // Fetch competitive exams to populate filters and uploader dropdowns
  const examFilter = document.getElementById('notes-exam-select');
  const uploadExam = document.getElementById('upload-notes-exam');

  const resExams = await API.get('/api/competitive-exams');
  if (resExams.success && resExams.exams) {
    resExams.exams.forEach(e => {
      examFilter.innerHTML += `<option value="${e.id}">${escapeHtml(e.name)}</option>`;
      uploadExam.innerHTML += `<option value="${e.id}">${escapeHtml(e.name)}</option>`;
    });
  }

  await fetchStudyMaterials();
  await fetchStorageStats();
}

async function fetchStudyMaterials() {
  const sortBy = document.getElementById('notes-sort-select').value;
  const grid = document.getElementById('study-materials-cards-grid');

  const res = await API.get(`/api/study-materials?sortBy=${sortBy}`);
  if (res.success) {
    rawStudyMaterials = res.materials || [];
    renderStudyMaterialsCardsList(rawStudyMaterials);
  } else {
    grid.innerHTML = '<div style="color:var(--text-danger); text-align:center;">Error loading study guides registry.</div>';
  }
}

async function fetchStorageStats() {
  const res = await API.get('/api/study-materials/stats');
  if (res.success && res.stats) {
    document.getElementById('storage-total-files').textContent = `${res.stats.totalFiles} Files`;
    const mb = (res.stats.totalBytes / (1024 * 1024)).toFixed(2);
    document.getElementById('storage-total-bytes').textContent = `${mb} MB`;
  }
}

function renderStudyMaterialsCardsList(list) {
  const container = document.getElementById('study-materials-cards-grid');
  container.innerHTML = '';
  const role = currentUser.role;

  if (list.length === 0) {
    container.innerHTML = '<div class="glass-card" style="padding: 40px; text-align: center; color: var(--text-light)">No study materials match this criteria.</div>';
    return;
  }

  list.forEach(m => {
    const sizeMb = (m.file_size / (1024 * 1024)).toFixed(2);
    const avgRating = m.rating_count > 0 ? (m.rating_sum / m.rating_count).toFixed(1) : 'N/A';
    
    // Linked exam details badge
    let linkedLabel = 'General Guide';
    if (m.exam_name) {
      linkedLabel = m.subject_name ? `${m.exam_name} (${m.subject_name})` : m.exam_name;
    }

    container.innerHTML += `
      <div class="glass-card fade-in" style="padding: 16px; display: flex; flex-direction: column; gap: 12px; position: relative;">
        
        <!-- Header row -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 16px;">
          <div>
            <span class="badge bg-info-subtle" style="font-size:0.7rem; margin-bottom: 6px;">${m.category}</span>
            <h4 style="font-weight: 700; font-size: 1.05rem; margin-bottom: 4px;">${escapeHtml(m.title)}</h4>
            <span style="font-size: 0.75rem; color: var(--text-light);">Uploader: <b>${escapeHtml(m.uploaded_by_name)}</b> &bull; Size: <b>${sizeMb} MB</b></span>
          </div>

          <!-- Bookmark & Like buttons -->
          <div style="display: flex; gap: 6px;">
            <button class="glass-btn" style="padding: 6px 8px; font-size: 0.8rem; background: ${m.is_liked === 1 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255,255,255,0.03)'};" onclick="toggleNotesLike(${m.id})">
              👍 <span style="font-size: 0.75rem; font-weight:700;">${m.likes_count}</span>
            </button>
            <button class="glass-btn" style="padding: 6px 8px; font-size: 0.8rem; background: ${m.is_bookmarked === 1 ? 'rgba(79, 70, 229, 0.15)' : 'rgba(255,255,255,0.03)'};" onclick="toggleNotesBookmark(${m.id})">
              ❤️
            </button>
          </div>
        </div>

        <div style="font-size: 0.8rem; color: var(--text-light); display: flex; justify-content: space-between; border-top: 1px dashed var(--border-color); padding-top: 8px;">
          <span>Category Association: <b>${escapeHtml(linkedLabel)}</b></span>
          <span>Downloads: <b>${m.downloads_count}</b></span>
        </div>

        <!-- Rating Controls -->
        <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.01); border-radius: 4px; padding: 6px 8px; border: 1px solid var(--border-color);">
          <span style="font-size: 0.8rem;">Rating: ⭐ <b>${avgRating}</b> (${m.rating_count} reviews)</span>
          <div style="display: flex; align-items: center; gap: 6px;">
            <span style="font-size: 0.7rem; color: var(--text-light);">Rate:</span>
            <select style="font-size: 0.75rem; background: transparent; color: inherit; border: 1px solid var(--border-color); border-radius: 3px; cursor: pointer; padding: 2px;" onchange="submitNotesRating(${m.id}, this.value)">
              <option value="">--</option>
              <option value="1">1 Star</option>
              <option value="2">2 Star</option>
              <option value="3">3 Star</option>
              <option value="4">4 Star</option>
              <option value="5">5 Star</option>
            </select>
          </div>
        </div>

        <!-- Actions -->
        <div style="display: flex; gap: 8px; border-top: 1px solid var(--border-color); padding-top: 12px; margin-top: 4px;">
          <button class="glass-btn" style="flex-grow: 1; padding: 8px 12px; font-size: 0.85rem;" onclick="downloadStudyNotes(${m.id})">
            Download Guide
          </button>
          ${role === 'admin' ? `
            <button class="glass-btn glass-btn-secondary" style="padding: 8px 12px; font-size: 0.85rem;" onclick="openReplaceNotesModal(${m.id})">Replace</button>
            <button class="glass-btn glass-btn-danger" style="padding: 8px 12px; font-size: 0.85rem;" onclick="deleteStudyNotes(${m.id})">Delete</button>
          ` : ''}
        </div>

      </div>
    `;
  });
}

function filterStudyMaterials() {
  const queryVal = document.getElementById('notes-search-input').value.toLowerCase();
  const categoryFilter = document.getElementById('notes-category-select').value;
  const examFilter = document.getElementById('notes-exam-select').value;
  const subFilter = document.getElementById('notes-subject-select').value;

  const filtered = rawStudyMaterials.filter(m => {
    const matchesSearch = m.title.toLowerCase().includes(queryVal);
    const matchesCategory = categoryFilter === 'all' || m.category === categoryFilter;
    const matchesExam = examFilter === 'all' || (m.exam_id && m.exam_id.toString() === examFilter);
    const matchesSubject = subFilter === 'all' || (m.subject_id && m.subject_id.toString() === subFilter);
    return matchesSearch && matchesCategory && matchesExam && matchesSubject;
  });

  renderStudyMaterialsCardsList(filtered);
}

// ---------------- EXAMS / SUBJECTS DYNAMIC FILTERS ----------------

async function loadNotesSubjectsSelectFilter() {
  const examId = document.getElementById('notes-exam-select').value;
  const subFilter = document.getElementById('notes-subject-select');
  subFilter.innerHTML = '<option value="all">All Subjects</option>';

  if (examId === 'all') return;

  const res = await API.get(`/api/competitive-exams/${examId}`);
  if (res.success && res.subjects) {
    res.subjects.forEach(s => {
      subFilter.innerHTML += `<option value="${s.id}">${escapeHtml(s.name)}</option>`;
    });
  }
}

async function loadUploadNotesSubjectsDropdown() {
  const examId = document.getElementById('upload-notes-exam').value;
  const wrapper = document.getElementById('upload-notes-subject-wrapper');
  const subDropdown = document.getElementById('upload-notes-subject');
  
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

// ---------------- POST TRIGGER API ACTIONS ----------------

async function downloadStudyNotes(id) {
  const token = localStorage.getItem('token');
  // Secure download using browser redirection
  window.open(`/api/study-materials/download/${id}?token=${token}`, '_blank');
  // refresh list shortly after to show download increment
  setTimeout(fetchStudyMaterials, 1500);
}

async function toggleNotesLike(id) {
  const res = await API.post('/api/study-materials/like', { id });
  if (res.success) fetchStudyMaterials();
}

async function toggleNotesBookmark(id) {
  const res = await API.post('/api/study-materials/bookmark', { id });
  if (res.success) fetchStudyMaterials();
}

async function submitNotesRating(id, rating) {
  if (!rating) return;
  const res = await API.post('/api/study-materials/rate', { id, rating: parseInt(rating, 10) });
  if (res.success) {
    alert(res.message || 'Rating submitted.');
    fetchStudyMaterials();
  }
}

async function deleteStudyNotes(id) {
  if (confirm('Delete this study guide? The physical file will be removed from server storage.')) {
    const res = await API.delete(`/api/study-materials/${id}`);
    if (res.success) {
      alert(res.message);
      fetchStudyMaterials();
      fetchStorageStats();
    }
  }
}

// Upload central notes file (handles Multer multipart upload with progress)
function submitCentralizedNotesUpload(e) {
  e.preventDefault();

  const title = document.getElementById('upload-notes-title').value;
  const category = document.getElementById('upload-notes-category').value;
  const examId = document.getElementById('upload-notes-exam').value;
  const subjectId = document.getElementById('upload-notes-subject').value;
  const fileInput = document.getElementById('upload-notes-file');

  if (fileInput.files.length === 0) {
    alert('Please choose a file to upload.');
    return;
  }

  const file = fileInput.files[0];
  const formData = new FormData();
  formData.append('title', title);
  formData.append('category', category);
  formData.append('examId', examId);
  formData.append('subjectId', subjectId);
  formData.append('file', file);

  const progressContainer = document.getElementById('upload-progress-container');
  const progressFill = document.getElementById('upload-progress-fill');
  const progressPercent = document.getElementById('upload-progress-percent');
  const token = localStorage.getItem('token');

  progressContainer.classList.remove('hidden');
  progressFill.style.width = '0%';
  progressPercent.textContent = '0%';

  // Implement upload using XMLHttpRequest to track progress
  const xhr = new XMLHttpRequest();
  xhr.open('POST', '/api/study-materials/upload', true);
  xhr.setRequestHeader('Authorization', `Bearer ${token}`);

  xhr.upload.onprogress = (event) => {
    if (event.lengthComputable) {
      const percentage = Math.round((event.loaded / event.total) * 100);
      progressFill.style.width = `${percentage}%`;
      progressPercent.textContent = `${percentage}%`;
    }
  };

  xhr.onload = () => {
    progressContainer.classList.add('hidden');
    try {
      const res = JSON.parse(xhr.responseText);
      if (xhr.status === 201 && res.success) {
        alert(res.message || 'Study material uploaded successfully.');
        document.getElementById('study-material-upload-form').reset();
        document.getElementById('upload-notes-subject-wrapper').style.display = 'none';
        fetchStudyMaterials();
        fetchStorageStats();
      } else {
        alert(res.message || 'File upload failed.');
      }
    } catch (err) {
      alert('Error parsing server response.');
    }
  };

  xhr.onerror = () => {
    progressContainer.classList.add('hidden');
    alert('Network error occurred during file upload.');
  };

  xhr.send(formData);
}

// Replace document file modal
function openReplaceNotesModal(id) {
  const content = `
    <form id="replace-notes-form" onsubmit="submitNotesFileReplacement(event, ${id})">
      <div class="form-group">
        <label>Select Replacement File</label>
        <input type="file" id="replace-notes-file-input" class="glass-input" style="padding: 8px 12px; cursor: pointer;" required>
      </div>
      <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:20px;">
        <button type="button" class="glass-btn glass-btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="submit" class="glass-btn">Replace File</button>
      </div>
    </form>
  `;
  showModal('Upload New Revision', content);
}

async function submitNotesFileReplacement(e, id) {
  e.preventDefault();
  const fileInput = document.getElementById('replace-notes-file-input');
  if (fileInput.files.length === 0) return;

  const file = fileInput.files[0];
  const formData = new FormData();
  formData.append('file', file);

  const token = localStorage.getItem('token');

  try {
    const response = await fetch(`/api/study-materials/replace/${id}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    const res = await response.json();
    if (response.ok && res.success) {
      alert(res.message || 'Notes file replaced successfully.');
      closeModal();
      fetchStudyMaterials();
      fetchStorageStats();
    } else {
      alert(res.message || 'Failed to replace file.');
    }
  } catch (error) {
    alert('Error replacing document.');
  }
}
