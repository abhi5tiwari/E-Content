const { query } = require('../database/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');

const JWT_SECRET = process.env.JWT_SECRET || 'portal_offline_secret_key_123';

// ==========================================
// 1. AUTHENTICATION CONTROLLER
// ==========================================

exports.register = async (req, res) => {
  const { username, email, password, role, full_name } = req.body;
  if (!username || !email || !password || !role || !full_name) {
    return res.status(400).json({ success: false, message: 'All registration parameters are required' });
  }

  try {
    const userExists = await query.get('SELECT id FROM users WHERE username = ? OR email = ?', [username, email]);
    if (userExists) {
      return res.status(400).json({ success: false, message: 'Username or Email is already registered' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const result = await query.run(
      'INSERT INTO users (username, email, password, role, full_name) VALUES (?, ?, ?, ?, ?)',
      [username, email, hashedPassword, role, full_name]
    );

    // Track activity
    await query.run(
      'INSERT INTO ActivityLogs (user_id, action) VALUES (?, ?)',
      [result.id, `Created a new user account as role: ${role}`]
    );

    res.status(201).json({ success: true, message: 'Registration successful! Please login.', userId: result.id });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, message: 'Server error registering user' });
  }
};

exports.login = async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username and Password are required' });
  }

  try {
    const user = await query.get('SELECT * FROM users WHERE username = ?', [username]);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, full_name: user.full_name, email: user.email },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Track activity
    await query.run(
      'INSERT INTO ActivityLogs (user_id, action) VALUES (?, ?)',
      [user.id, 'Logged in successfully']
    );

    res.cookie('token', token, { httpOnly: true, maxAge: 24 * 60 * 60 * 1000 });
    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: { id: user.id, username: user.username, role: user.role, full_name: user.full_name, email: user.email }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error logging in' });
  }
};

exports.logout = async (req, res) => {
  res.clearCookie('token');
  res.status(200).json({ success: true, message: 'Logged out successfully' });
};

exports.getCurrentUser = async (req, res) => {
  try {
    const user = await query.get('SELECT id, username, email, role, full_name FROM users WHERE id = ?', [req.user.id]);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.status(200).json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error loading user info' });
  }
};

// ==========================================
// 2. USER MANAGER CONTROLLER
// ==========================================

exports.getUsers = async (req, res) => {
  try {
    const usersList = await query.all('SELECT id, username, email, role, full_name, created_at FROM users ORDER BY full_name ASC');
    res.status(200).json({ success: true, users: usersList });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error retrieving user list' });
  }
};

exports.createUser = async (req, res) => {
  const { username, email, password, role, full_name } = req.body;
  if (!username || !email || !password || !role || !full_name) {
    return res.status(400).json({ success: false, message: 'All inputs are required' });
  }
  try {
    const exists = await query.get('SELECT id FROM users WHERE username = ? OR email = ?', [username, email]);
    if (exists) return res.status(400).json({ success: false, message: 'Username/Email already exists' });

    const salt = await bcrypt.genSalt(10);
    const pass = await bcrypt.hash(password, salt);

    const result = await query.run('INSERT INTO users (username, email, password, role, full_name) VALUES (?, ?, ?, ?, ?)', [username, email, pass, role, full_name]);
    
    // Log
    await query.run('INSERT INTO ActivityLogs (user_id, action) VALUES (?, ?)', [req.user.id, `Created user "${full_name}" with role: ${role}`]);

    res.status(201).json({ success: true, message: 'User created successfully.', userId: result.id });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Error creating user' });
  }
};

exports.updateUser = async (req, res) => {
  const { id } = req.params;
  const { email, password, role, full_name } = req.body;
  try {
    const user = await query.get('SELECT id, full_name FROM users WHERE id = ?', [id]);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    let updateQuery = 'UPDATE users SET email = ?, role = ?, full_name = ? WHERE id = ?';
    let params = [email, role, full_name, id];

    if (password) {
      const salt = await bcrypt.genSalt(10);
      const pass = await bcrypt.hash(password, salt);
      updateQuery = 'UPDATE users SET email = ?, password = ?, role = ?, full_name = ? WHERE id = ?';
      params = [email, pass, role, full_name, id];
    }

    await query.run(updateQuery, params);
    
    // Log
    await query.run('INSERT INTO ActivityLogs (user_id, action) VALUES (?, ?)', [req.user.id, `Updated user parameters for "${user.full_name}"`]);

    res.status(200).json({ success: true, message: 'User updated successfully.' });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Error updating user profile' });
  }
};

exports.deleteUser = async (req, res) => {
  const { id } = req.params;
  if (parseInt(id) === req.user.id) {
    return res.status(400).json({ success: false, message: 'You cannot delete your own logged-in user account' });
  }
  try {
    const user = await query.get('SELECT full_name FROM users WHERE id = ?', [id]);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    await query.run('DELETE FROM users WHERE id = ?', [id]);
    
    // Log
    await query.run('INSERT INTO ActivityLogs (user_id, action) VALUES (?, ?)', [req.user.id, `Deleted user account: "${user.full_name}"`]);

    res.status(200).json({ success: true, message: `User "${user.full_name}" deleted successfully.` });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Error deleting user' });
  }
};

// ==========================================
// 3. MOCK EXAMS CONTROLLER
// ==========================================

exports.getExams = async (req, res) => {
  const userId = req.user.id;
  const isStudent = req.user.role === 'student';
  try {
    let list;
    if (isStudent) {
      list = await query.all(`
        SELECT e.*, 
               (SELECT MAX(ea.score) FROM exam_attempts ea WHERE ea.exam_id = e.id AND ea.student_id = ?) as high_score,
               (SELECT COUNT(*) FROM exam_attempts ea WHERE ea.exam_id = e.id AND ea.student_id = ?) as attempts_count
        FROM mock_exams e
        ORDER BY e.created_at DESC
      `, [userId, userId]);
    } else {
      list = await query.all('SELECT * FROM mock_exams ORDER BY created_at DESC');
    }
    res.status(200).json({ success: true, exams: list });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error retrieving mock exams list' });
  }
};

exports.getExamDetails = async (req, res) => {
  const { id } = req.params;
  const { role } = req.user;
  try {
    const exam = await query.get('SELECT * FROM mock_exams WHERE id = ?', [id]);
    if (!exam) return res.status(404).json({ success: false, message: 'Mock Exam not found' });

    let questions;
    if (role === 'student') {
      questions = await query.all('SELECT id, exam_id, question_text, option_a, option_b, option_c, option_d FROM questions WHERE exam_id = ?', [id]);
    } else {
      questions = await query.all('SELECT * FROM questions WHERE exam_id = ?', [id]);
    }
    res.status(200).json({ success: true, exam, questions });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Error loading mock exam questions' });
  }
};

exports.submitExam = async (req, res) => {
  const { examId, answers } = req.body;
  const studentId = req.user.id;
  if (!examId || !answers) return res.status(400).json({ success: false, message: 'Answers sheet is missing' });

  try {
    const exam = await query.get('SELECT * FROM mock_exams WHERE id = ?', [examId]);
    if (!exam) return res.status(404).json({ success: false, message: 'Mock Exam not found' });

    const questions = await query.all('SELECT id, correct_option FROM questions WHERE exam_id = ?', [examId]);
    let correct = 0;
    const correctKeys = {};

    questions.forEach(q => {
      correctKeys[q.id] = q.correct_option;
      if (answers[q.id] && answers[q.id].toUpperCase() === q.correct_option.toUpperCase()) {
        correct++;
      }
    });

    const total_questions = questions.length;
    const score = Math.round((correct / total_questions) * exam.total_marks);

    const attempt = await query.run('INSERT INTO exam_attempts (student_id, exam_id, score, total_questions, correct_answers) VALUES (?, ?, ?, ?, ?)', [studentId, examId, score, total_questions, correct]);

    const other = await query.get('SELECT MAX(score) as max_score FROM exam_attempts WHERE student_id = ? AND exam_id = ? AND id != ?', [studentId, examId, attempt.id]);
    if (!other.max_score || score > other.max_score) {
      await query.run('INSERT INTO Notifications (user_id, message, type) VALUES (?, ?, ?)', [studentId, `Congratulations! New high score of ${score}/${exam.total_marks} in mock exam "${exam.title}".`, 'exam_result']);
    }

    await query.run('INSERT INTO ActivityLogs (user_id, action) VALUES (?, ?)', [studentId, `Completed practice test "${exam.title}" scoring ${score}/${exam.total_marks}`]);

    res.status(200).json({ success: true, attemptId: attempt.id, score, totalMarks: exam.total_marks, totalQuestions: total_questions, correctAnswers: correct, correctKeys });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error grading exam sheet' });
  }
};

exports.createExam = async (req, res) => {
  const { title, subject, duration_minutes, total_marks, eligibility_criteria, questions } = req.body;
  if (!title || !subject || !duration_minutes || !total_marks) return res.status(400).json({ success: false, message: 'Missing basic inputs' });
  try {
    const result = await query.run('INSERT INTO mock_exams (title, subject, duration_minutes, total_marks, eligibility_criteria) VALUES (?, ?, ?, ?, ?)', [title, subject, duration_minutes, total_marks, eligibility_criteria || 'Open to all']);
    if (questions && Array.isArray(questions)) {
      for (const q of questions) {
        await query.run('INSERT INTO questions (exam_id, question_text, option_a, option_b, option_c, option_d, correct_option) VALUES (?, ?, ?, ?, ?, ?, ?)', [result.id, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d, q.correct_option.toUpperCase()]);
      }
    }
    await query.run("INSERT INTO Notifications (message, type) VALUES (?, 'upcoming_exam')", [`New Practice Mock Exam added: "${title}" in Subject: ${subject}.`]);
    res.status(201).json({ success: true, message: 'Mock Exam paper created.' });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Error seeding mock exam paper' });
  }
};

exports.deleteExam = async (req, res) => {
  const { id } = req.params;
  try {
    await query.run('DELETE FROM mock_exams WHERE id = ?', [id]);
    res.status(200).json({ success: true, message: 'Mock exam deleted.' });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Error deleting mock test' });
  }
};

exports.getAttempts = async (req, res) => {
  const userId = req.user.id;
  const role = req.user.role;
  try {
    let list;
    if (role === 'admin') {
      list = await query.all('SELECT ea.*, u.full_name as student_name, e.title as exam_title, e.subject FROM exam_attempts ea JOIN users u ON ea.student_id = u.id JOIN mock_exams e ON ea.exam_id = e.id ORDER BY ea.attempt_date DESC');
    } else {
      list = await query.all('SELECT ea.*, e.title as exam_title, e.subject FROM exam_attempts ea JOIN mock_exams e ON ea.exam_id = e.id WHERE ea.student_id = ? ORDER BY ea.attempt_date DESC', [userId]);
    }
    res.status(200).json({ success: true, attempts: list });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Error loading attempts' });
  }
};

// ==========================================
// 4. COMPETITIVE EXAMS INFO CONTROLLER
// ==========================================

exports.getCompExams = async (req, res) => {
  const { search, categoryId, qualification } = req.query;
  try {
    let sql = 'SELECT e.*, c.name as category_name FROM Exams e JOIN ExamCategories c ON e.category_id = c.id WHERE 1=1';
    let params = [];
    if (search) {
      sql += ' AND (e.name LIKE ? OR e.conducting_authority LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    if (categoryId) {
      sql += ' AND e.category_id = ?';
      params.push(categoryId);
    }
    if (qualification) {
      sql += ' AND e.educational_qualification LIKE ?';
      params.push(`%${qualification}%`);
    }
    sql += ' ORDER BY e.name ASC';
    const list = await query.all(sql, params);
    const cats = await query.all('SELECT * FROM ExamCategories ORDER BY name ASC');
    res.status(200).json({ success: true, exams: list, categories: cats });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Error retrieving exam profiles' });
  }
};

exports.getCompExamDetails = async (req, res) => {
  const { id } = req.params;
  try {
    const exam = await query.get('SELECT e.*, c.name as category_name FROM Exams e JOIN ExamCategories c ON e.category_id = c.id WHERE e.id = ?', [id]);
    if (!exam) return res.status(404).json({ success: false, message: 'Exam profile not found' });
    const subjects = await query.all('SELECT * FROM Subjects WHERE exam_id = ? ORDER BY name ASC', [id]);
    res.status(200).json({ success: true, exam, subjects });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Error retrieving exam details' });
  }
};

exports.createCompExam = async (req, res) => {
  const { name, category_id, conducting_authority, short_description, official_website, level, educational_qualification, age_limit, salary, application_fee, exam_pattern, selection_process } = req.body;
  if (!name || !category_id) return res.status(400).json({ success: false, message: 'Name and Category required' });
  try {
    const result = await query.run(`
      INSERT INTO Exams (name, category_id, conducting_authority, short_description, official_website, level, educational_qualification, age_limit, salary, application_fee, exam_pattern, selection_process, eligibility, num_attempts, syllabus_overview, subjects, cutoff_previous_year, job_profile, career_growth, promotion, preparation_tips, important_dates, admit_card_status, result_status, faq)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Open to all', '6 Attempts', 'General Overview', 'General Topics', 'N/A', 'Officer Post', 'Standard Grade', 'Performance based', 'Study daily', 'TBA', 'Awaited', 'Awaited', '[]')
    `, [name, category_id, conducting_authority, short_description, official_website, level || 'National', educational_qualification, age_limit, salary, application_fee, exam_pattern, selection_process]);
    
    await query.run("INSERT INTO Notifications (message, type) VALUES (?, 'upcoming_exam')", [`New Competitive Exam Profile added: "${name}".`]);
    res.status(201).json({ success: true, message: 'Exam profile created successfully.', examId: result.id });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'Error creating exam profile' });
  }
};

exports.updateCompExam = async (req, res) => {
  const { id } = req.params;
  const { name, category_id, conducting_authority, short_description, official_website, level, educational_qualification, age_limit, salary, application_fee } = req.body;
  try {
    await query.run(`
      UPDATE Exams 
      SET name = ?, category_id = ?, conducting_authority = ?, short_description = ?, official_website = ?, level = ?, educational_qualification = ?, age_limit = ?, salary = ?, application_fee = ?
      WHERE id = ?
    `, [name, category_id, conducting_authority, short_description, official_website, level, educational_qualification, age_limit, salary, application_fee, id]);
    res.status(200).json({ success: true, message: 'Exam profile updated.' });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Error updating exam profile' });
  }
};

exports.deleteCompExam = async (req, res) => {
  const { id } = req.params;
  try {
    await query.run('DELETE FROM Exams WHERE id = ?', [id]);
    res.status(200).json({ success: true, message: 'Exam profile deleted.' });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Error deleting exam profile' });
  }
};

exports.getCompCategories = async (req, res) => {
  try {
    const list = await query.all('SELECT * FROM ExamCategories ORDER BY name ASC');
    res.status(200).json({ success: true, categories: list });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Error loading categories' });
  }
};

// ==========================================
// 5. SYLLABUS CONTROLLER
// ==========================================

exports.getSyllabus = async (req, res) => {
  const { examId } = req.params;
  const userId = req.user.id;
  try {
    const subjects = await query.all('SELECT * FROM Subjects WHERE exam_id = ? ORDER BY name ASC', [examId]);
    const subjectsIds = subjects.map(s => s.id);
    if (subjectsIds.length === 0) return res.status(200).json({ success: true, syllabus: [] });

    const placeholders = subjectsIds.map(() => '?').join(',');
    const units = await query.all(`SELECT * FROM Units WHERE subject_id IN (${placeholders}) ORDER BY name ASC`, subjectsIds);
    const unitsIds = units.map(u => u.id);

    let topics = [];
    if (unitsIds.length > 0) {
      const unitsPlaceholders = unitsIds.map(() => '?').join(',');
      topics = await query.all(`
        SELECT t.*, IFNULL(tp.status, 0) as is_completed
        FROM Topics t
        LEFT JOIN TopicProgress tp ON t.id = tp.topic_id AND tp.student_id = ?
        WHERE t.unit_id IN (${unitsPlaceholders})
        ORDER BY t.name ASC
      `, [userId, ...unitsIds]);
    }

    const tree = subjects.map(sub => {
      const subUnits = units.filter(u => u.subject_id === sub.id).map(un => {
        return { ...un, topics: topics.filter(t => t.unit_id === un.id) };
      });
      return { ...sub, units: subUnits };
    });
    res.status(200).json({ success: true, syllabus: tree });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Error loading syllabus structure' });
  }
};

exports.toggleTopicStatus = async (req, res) => {
  const { topicId, status } = req.body;
  const studentId = req.user.id;
  try {
    const topic = await query.get('SELECT name FROM Topics WHERE id = ?', [topicId]);
    if (!topic) return res.status(404).json({ success: false, message: 'Topic not found' });

    await query.run(`
      INSERT INTO TopicProgress (student_id, topic_id, status, updated_at) 
      VALUES (?, ?, ?, datetime('now'))
      ON CONFLICT(student_id, topic_id) DO UPDATE SET status = excluded.status, updated_at = datetime('now')
    `, [studentId, topicId, status]);

    await query.run('INSERT INTO ActivityLogs (user_id, action) VALUES (?, ?)', [studentId, `${status === 1 ? 'Completed' : 'Reset'} topic "${topic.name}"`]);
    res.status(200).json({ success: true, message: 'Progress updated.' });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Error updating topic status' });
  }
};

exports.getSyllabusProgress = async (req, res) => {
  const { examId } = req.params;
  const studentId = req.user.id;
  try {
    const totals = await query.get(`
      SELECT COUNT(t.id) as total_topics,
             SUM(CASE WHEN tp.status = 1 THEN 1 ELSE 0 END) as completed_topics
      FROM Topics t
      JOIN Units u ON t.unit_id = u.id
      JOIN Subjects s ON u.subject_id = s.id
      LEFT JOIN TopicProgress tp ON t.id = tp.topic_id AND tp.student_id = ?
      WHERE s.exam_id = ?
    `, [studentId, examId]);
    const total = totals.total_topics || 0;
    const completed = totals.completed_topics || 0;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    res.status(200).json({ success: true, stats: { totalTopics: total, completedTopics: completed, percentage } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Error fetching progress stats' });
  }
};

exports.addSubject = async (req, res) => {
  const { examId, name } = req.body;
  try {
    const result = await query.run('INSERT INTO Subjects (exam_id, name) VALUES (?, ?)', [examId, name]);
    res.status(201).json({ success: true, id: result.id });
  } catch (e) { res.status(500).json({ success: false }); }
};

exports.addUnit = async (req, res) => {
  const { subjectId, name } = req.body;
  try {
    const result = await query.run('INSERT INTO Units (subject_id, name) VALUES (?, ?)', [subjectId, name]);
    res.status(201).json({ success: true, id: result.id });
  } catch (e) { res.status(500).json({ success: false }); }
};

exports.addTopic = async (req, res) => {
  const { unitId, name, weightage, difficulty, prep_time } = req.body;
  try {
    const result = await query.run('INSERT INTO Topics (unit_id, name, weightage, difficulty, prep_time) VALUES (?, ?, ?, ?, ?)', [unitId, name, weightage, difficulty, prep_time]);
    res.status(201).json({ success: true, id: result.id });
  } catch (e) { res.status(500).json({ success: false }); }
};

exports.deleteSubject = async (req, res) => {
  try {
    await query.run('DELETE FROM Subjects WHERE id = ?', [req.params.id]);
    res.status(200).json({ success: true });
  } catch (e) { res.status(500).json({ success: false }); }
};

exports.deleteUnit = async (req, res) => {
  try {
    await query.run('DELETE FROM Units WHERE id = ?', [req.params.id]);
    res.status(200).json({ success: true });
  } catch (e) { res.status(500).json({ success: false }); }
};

exports.deleteTopic = async (req, res) => {
  try {
    await query.run('DELETE FROM Topics WHERE id = ?', [req.params.id]);
    res.status(200).json({ success: true });
  } catch (e) { res.status(500).json({ success: false }); }
};

// ==========================================
// 6. STUDY MATERIALS CONTROLLER
// ==========================================

exports.getStudyMaterials = async (req, res) => {
  const { search, category, examId, subjectId, sortBy } = req.query;
  const userId = req.user.id;
  try {
    let sql = `
      SELECT sm.*, e.name as exam_name, s.name as subject_name,
             (SELECT COUNT(*) FROM Bookmarks b WHERE b.material_id = sm.id AND b.user_id = ?) as is_bookmarked,
             (SELECT COUNT(*) FROM MaterialLikes ml WHERE ml.material_id = sm.id AND ml.user_id = ?) as is_liked
      FROM StudyMaterials sm
      LEFT JOIN Exams e ON sm.exam_id = e.id
      LEFT JOIN Subjects s ON sm.subject_id = s.id
      WHERE 1=1
    `;
    let params = [userId, userId];
    if (search) {
      sql += ' AND sm.title LIKE ?';
      params.push(`%${search}%`);
    }
    if (category) {
      sql += ' AND sm.category = ?';
      params.push(category);
    }
    if (examId) {
      sql += ' AND sm.exam_id = ?';
      params.push(examId);
    }
    if (subjectId) {
      sql += ' AND sm.subject_id = ?';
      params.push(subjectId);
    }
    if (sortBy === 'downloads') {
      sql += ' ORDER BY sm.downloads_count DESC';
    } else {
      sql += ' ORDER BY sm.uploaded_at DESC';
    }
    const list = await query.all(sql, params);
    res.status(200).json({ success: true, materials: list });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Error loading notes' });
  }
};

exports.uploadStudyMaterial = async (req, res) => {
  const { title, category, examId, subjectId } = req.body;
  const userId = req.user.id;
  const userName = req.user.full_name;

  if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

  try {
    const examRef = examId && examId !== 'null' ? parseInt(examId, 10) : null;
    const subjectRef = subjectId && subjectId !== 'null' ? parseInt(subjectId, 10) : null;

    const result = await query.run(`
      INSERT INTO StudyMaterials (title, category, filename, file_size, uploaded_by, uploaded_by_name, exam_id, subject_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [title, category, req.file.filename, req.file.size, userId, userName, examRef, subjectRef]);

    await query.run(`
      INSERT INTO Uploads (filename, original_name, mime_type, file_size, uploaded_by)
      VALUES (?, ?, ?, ?, ?)
    `, [req.file.filename, req.file.originalname, req.file.mimetype, req.file.size, userId]);

    await query.run("INSERT INTO Notifications (message, type) VALUES (?, 'notes_uploaded')", [`New Notes uploaded: "${title}" under Category: ${category}.`]);
    await query.run('INSERT INTO ActivityLogs (user_id, action) VALUES (?, ?)', [userId, `Uploaded guide "${title}"`]);

    res.status(201).json({ success: true, message: 'Study guide uploaded successfully.', materialId: result.id });
  } catch (e) {
    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ success: false, message: 'Error saving metadata' });
  }
};

exports.downloadStudyMaterial = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  try {
    const mat = await query.get('SELECT * FROM StudyMaterials WHERE id = ?', [id]);
    if (!mat) return res.status(404).json({ success: false, message: 'Material not found' });

    const filePath = path.join(__dirname, '../public/uploads', mat.filename);
    if (!fs.existsSync(filePath)) return res.status(404).json({ success: false, message: 'File missing from storage' });

    await query.run('UPDATE StudyMaterials SET downloads_count = downloads_count + 1 WHERE id = ?', [id]);
    await query.run('INSERT INTO Downloads (user_id, material_id) VALUES (?, ?)', [userId, id]);
    await query.run('INSERT INTO ActivityLogs (user_id, action) VALUES (?, ?)', [userId, `Downloaded note "${mat.title}"`]);

    res.download(filePath, mat.title + path.extname(mat.filename));
  } catch (e) {
    res.status(500).json({ success: false, message: 'Error processing download' });
  }
};

exports.toggleBookmark = async (req, res) => {
  const { id } = req.body;
  const userId = req.user.id;
  try {
    const b = await query.get('SELECT id FROM Bookmarks WHERE user_id = ? AND material_id = ?', [userId, id]);
    if (b) {
      await query.run('DELETE FROM Bookmarks WHERE id = ?', [b.id]);
      res.status(200).json({ success: true, bookmarked: false });
    } else {
      await query.run('INSERT INTO Bookmarks (user_id, material_id) VALUES (?, ?)', [userId, id]);
      res.status(200).json({ success: true, bookmarked: true });
    }
  } catch (e) { res.status(500).json({ success: false }); }
};

exports.toggleLike = async (req, res) => {
  const { id } = req.body;
  const userId = req.user.id;
  try {
    const l = await query.get('SELECT id FROM MaterialLikes WHERE user_id = ? AND material_id = ?', [userId, id]);
    if (l) {
      await query.run('DELETE FROM MaterialLikes WHERE id = ?', [l.id]);
      await query.run('UPDATE StudyMaterials SET likes_count = MAX(0, likes_count - 1) WHERE id = ?', [id]);
      res.status(200).json({ success: true, liked: false });
    } else {
      await query.run('INSERT INTO MaterialLikes (user_id, material_id) VALUES (?, ?)', [userId, id]);
      await query.run('UPDATE StudyMaterials SET likes_count = likes_count + 1 WHERE id = ?', [id]);
      res.status(200).json({ success: true, liked: true });
    }
  } catch (e) { res.status(500).json({ success: false }); }
};

exports.rateMaterial = async (req, res) => {
  const { id, rating } = req.body;
  const userId = req.user.id;
  try {
    const exist = await query.get('SELECT id, rating FROM MaterialRatings WHERE user_id = ? AND material_id = ?', [userId, id]);
    if (exist) {
      const diff = rating - exist.rating;
      await query.run('UPDATE MaterialRatings SET rating = ? WHERE id = ?', [rating, exist.id]);
      await query.run('UPDATE StudyMaterials SET rating_sum = rating_sum + ? WHERE id = ?', [diff, id]);
    } else {
      await query.run('INSERT INTO MaterialRatings (user_id, material_id, rating) VALUES (?, ?, ?)', [userId, id, rating]);
      await query.run('UPDATE StudyMaterials SET rating_sum = rating_sum + ?, rating_count = rating_count + 1 WHERE id = ?', [rating, id]);
    }
    res.status(200).json({ success: true, message: 'Rating saved' });
  } catch (e) { res.status(500).json({ success: false }); }
};

exports.getBookmarkedMaterials = async (req, res) => {
  const userId = req.user.id;
  try {
    const list = await query.all('SELECT sm.* FROM Bookmarks b JOIN StudyMaterials sm ON b.material_id = sm.id WHERE b.user_id = ?', [userId]);
    res.status(200).json({ success: true, bookmarks: list });
  } catch (e) { res.status(500).json({ success: false }); }
};

exports.replaceStudyMaterial = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  if (!req.file) return res.status(400).json({ success: false, message: 'No file' });
  try {
    const mat = await query.get('SELECT filename, title FROM StudyMaterials WHERE id = ?', [id]);
    if (!mat) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ success: false });
    }
    const oldPath = path.join(__dirname, '../public/uploads', mat.filename);
    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);

    await query.run('UPDATE StudyMaterials SET filename = ?, file_size = ? WHERE id = ?', [req.file.filename, req.file.size, id]);
    await query.run('INSERT INTO Uploads (filename, original_name, mime_type, file_size, uploaded_by) VALUES (?, ?, ?, ?, ?)', [req.file.filename, req.file.originalname, req.file.mimetype, req.file.size, userId]);
    res.status(200).json({ success: true, message: 'Revision replaced.' });
  } catch (e) { res.status(500).json({ success: false }); }
};

exports.deleteStudyMaterial = async (req, res) => {
  const { id } = req.params;
  try {
    const mat = await query.get('SELECT filename FROM StudyMaterials WHERE id = ?', [id]);
    if (mat) {
      const p = path.join(__dirname, '../public/uploads', mat.filename);
      if (fs.existsSync(p)) fs.unlinkSync(p);
      await query.run('DELETE FROM StudyMaterials WHERE id = ?', [id]);
    }
    res.status(200).json({ success: true, message: 'Study guide deleted.' });
  } catch (e) { res.status(500).json({ success: false }); }
};

exports.getStorageStats = async (req, res) => {
  try {
    const stats = await query.get('SELECT COUNT(*) as count, SUM(file_size) as total_size FROM StudyMaterials');
    res.status(200).json({ success: true, stats: { totalFiles: stats.count || 0, totalBytes: stats.total_size || 0 } });
  } catch (e) { res.status(500).json({ success: false }); }
};

// ==========================================
// 7. DOUBT DISCUSSION FORUM CONTROLLER
// ==========================================

exports.getDoubts = async (req, res) => {
  const { search, examId, sortBy } = req.query;
  const userId = req.user.id;
  try {
    let sql = `
      SELECT d.*, 
             (SELECT COUNT(*) FROM DoubtVotes dv WHERE dv.doubt_id = d.id AND dv.user_id = ?) as is_upvoted,
             (SELECT COUNT(*) FROM Replies r WHERE r.doubt_id = d.id) as replies_count
      FROM Doubts d WHERE 1=1
    `;
    let params = [userId];
    if (search) {
      sql += ' AND (d.title LIKE ? OR d.description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    if (examId) {
      sql += ' AND d.exam_id = ?';
      params.push(examId);
    }
    sql += ' ORDER BY d.is_pinned DESC';
    if (sortBy === 'popular') {
      sql += ', d.upvotes_count DESC';
    } else {
      sql += ', d.created_at DESC';
    }
    const list = await query.all(sql, params);
    res.status(200).json({ success: true, doubts: list });
  } catch (e) { res.status(500).json({ success: false }); }
};

exports.getDoubtDetails = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  try {
    const doubt = await query.get('SELECT d.*, (SELECT COUNT(*) FROM DoubtVotes dv WHERE dv.doubt_id = d.id AND dv.user_id = ?) as is_upvoted FROM Doubts d WHERE d.id = ?', [userId, id]);
    if (!doubt) return res.status(404).json({ success: false });
    const replies = await query.all('SELECT * FROM Replies WHERE doubt_id = ? ORDER BY created_at ASC', [id]);
    res.status(200).json({ success: true, doubt, replies });
  } catch (e) { res.status(500).json({ success: false }); }
};

exports.askDoubt = async (req, res) => {
  const { title, description, examId, subjectId } = req.body;
  const userId = req.user.id;
  const name = req.user.full_name;
  try {
    const examRef = examId && examId !== 'null' ? parseInt(examId, 10) : null;
    const subjectRef = subjectId && subjectId !== 'null' ? parseInt(subjectId, 10) : null;

    const result = await query.run('INSERT INTO Doubts (user_id, user_name, title, description, exam_id, subject_id) VALUES (?, ?, ?, ?, ?, ?)', [userId, name, title, description, examRef, subjectRef]);
    await query.run('INSERT INTO ActivityLogs (user_id, action) VALUES (?, ?)', [userId, `Asked doubt: "${title}"`]);
    res.status(201).json({ success: true, doubtId: result.id });
  } catch (e) { res.status(500).json({ success: false }); }
};

exports.replyToDoubt = async (req, res) => {
  const { doubtId, message } = req.body;
  const userId = req.user.id;
  const name = req.user.full_name;
  const isAdmin = req.user.role === 'admin' ? 1 : 0;
  try {
    const d = await query.get('SELECT user_id, title, is_locked FROM Doubts WHERE id = ?', [doubtId]);
    if (!d) return res.status(404).json({ success: false });
    if (d.is_locked) return res.status(403).json({ success: false, message: 'Discussion locked' });

    await query.run('INSERT INTO Replies (doubt_id, user_id, user_name, message, is_admin_reply) VALUES (?, ?, ?, ?, ?)', [doubtId, userId, name, message, isAdmin]);
    if (d.user_id !== userId) {
      await query.run('INSERT INTO Notifications (user_id, message, type) VALUES (?, ?, ?)', [d.user_id, `New comment on doubt "${d.title}" from ${name}.`, 'forum_reply']);
    }
    res.status(201).json({ success: true });
  } catch (e) { res.status(500).json({ success: false }); }
};

exports.toggleUpvote = async (req, res) => {
  const { id } = req.body;
  const userId = req.user.id;
  try {
    const vote = await query.get('SELECT id FROM DoubtVotes WHERE user_id = ? AND doubt_id = ?', [userId, id]);
    if (vote) {
      await query.run('DELETE FROM DoubtVotes WHERE id = ?', [vote.id]);
      await query.run('UPDATE Doubts SET upvotes_count = MAX(0, upvotes_count - 1) WHERE id = ?', [id]);
      res.status(200).json({ success: true, upvoted: false });
    } else {
      await query.run('INSERT INTO DoubtVotes (user_id, doubt_id) VALUES (?, ?)', [userId, id]);
      await query.run('UPDATE Doubts SET upvotes_count = upvotes_count + 1 WHERE id = ?', [id]);
      res.status(200).json({ success: true, upvoted: true });
    }
  } catch (e) { res.status(500).json({ success: false }); }
};

exports.markAsSolved = async (req, res) => {
  const { id, isSolved } = req.body;
  try {
    await query.run('UPDATE Doubts SET is_solved = ? WHERE id = ?', [isSolved, id]);
    res.status(200).json({ success: true });
  } catch (e) { res.status(500).json({ success: false }); }
};

exports.lockDiscussion = async (req, res) => {
  const { id, isLocked } = req.body;
  try {
    await query.run('UPDATE Doubts SET is_locked = ? WHERE id = ?', [isLocked, id]);
    res.status(200).json({ success: true });
  } catch (e) { res.status(500).json({ success: false }); }
};

exports.pinDoubt = async (req, res) => {
  const { id, isPinned } = req.body;
  try {
    await query.run('UPDATE Doubts SET is_pinned = ? WHERE id = ?', [isPinned, id]);
    res.status(200).json({ success: true });
  } catch (e) { res.status(500).json({ success: false }); }
};

exports.deleteDoubt = async (req, res) => {
  try {
    await query.run('DELETE FROM Doubts WHERE id = ?', [req.params.id]);
    res.status(200).json({ success: true });
  } catch (e) { res.status(500).json({ success: false }); }
};

// ==========================================
// 8. LIBRARY INVENTORY CONTROLLER
// ==========================================

exports.getBooks = async (req, res) => {
  const { search, category } = req.query;
  const userId = req.user.id;
  const isStudent = req.user.role === 'student';
  try {
    let sql = 'SELECT * FROM books WHERE 1=1';
    let params = [];
    if (search) {
      sql += ' AND (title LIKE ? OR author LIKE ? OR isbn LIKE ?)';
      const p = `%${search}%`;
      params.push(p, p, p);
    }
    if (category && category !== 'all') {
      sql += ' AND category = ?';
      params.push(category);
    }
    sql += ' ORDER BY title ASC';
    const booksList = await query.all(sql, params);

    let borrows = [];
    if (isStudent) {
      borrows = await query.all("SELECT book_id, status, due_date FROM borrow_records WHERE student_id = ? AND status IN ('requested', 'approved')", [userId]);
    }
    res.status(200).json({ success: true, books: booksList, studentBorrows: borrows });
  } catch (e) { res.status(500).json({ success: false }); }
};

exports.addBook = async (req, res) => {
  const { title, author, isbn, category, quantity, location } = req.body;
  try {
    await query.run('INSERT INTO books (title, author, isbn, category, quantity, available_quantity, location) VALUES (?, ?, ?, ?, ?, ?, ?)', [title, author, isbn, category, quantity, quantity, location]);
    res.status(201).json({ success: true, message: 'Book created' });
  } catch (e) { res.status(500).json({ success: false, message: 'Error adding book' }); }
};

exports.updateBook = async (req, res) => {
  const { id } = req.params;
  const { title, author, isbn, category, quantity, location } = req.body;
  try {
    const book = await query.get('SELECT quantity, available_quantity FROM books WHERE id = ?', [id]);
    if (!book) return res.status(404).json({ success: false });

    const diff = quantity - book.quantity;
    const newAvail = book.available_quantity + diff;

    await query.run('UPDATE books SET title = ?, author = ?, isbn = ?, category = ?, quantity = ?, available_quantity = ?, location = ? WHERE id = ?', [title, author, isbn, category, quantity, newAvail, location, id]);
    res.status(200).json({ success: true, message: 'Book updated' });
  } catch (e) { res.status(500).json({ success: false }); }
};

exports.deleteBook = async (req, res) => {
  try {
    await query.run('DELETE FROM books WHERE id = ?', [req.params.id]);
    res.status(200).json({ success: true });
  } catch (e) { res.status(500).json({ success: false }); }
};

exports.getBorrowRequests = async (req, res) => {
  try {
    const list = await query.all(`
      SELECT br.*, u.full_name as student_name, b.title as book_title, b.isbn, b.available_quantity
      FROM borrow_records br
      JOIN users u ON br.student_id = u.id
      JOIN books b ON br.book_id = b.id
      WHERE br.status = 'requested'
      ORDER BY br.request_date ASC
    `);
    res.status(200).json({ success: true, requests: list });
  } catch (e) { res.status(500).json({ success: false }); }
};

exports.requestBook = async (req, res) => {
  const { bookId } = req.body;
  const studentId = req.user.id;
  try {
    const active = await query.get("SELECT id FROM borrow_records WHERE student_id = ? AND book_id = ? AND status IN ('requested', 'approved')", [studentId, bookId]);
    if (active) return res.status(400).json({ success: false, message: 'You already requested/borrowed this book title.' });

    const book = await query.get('SELECT title, available_quantity FROM books WHERE id = ?', [bookId]);
    if (!book || book.available_quantity <= 0) return res.status(400).json({ success: false, message: 'Book is currently out of stock.' });

    await query.run('INSERT INTO borrow_records (book_id, student_id, status) VALUES (?, ?, ?)', [bookId, studentId, 'requested']);
    res.status(201).json({ success: true, message: 'Borrow request submitted successfully.' });
  } catch (e) { res.status(500).json({ success: false }); }
};

exports.approveBorrow = async (req, res) => {
  const { id } = req.params;
  const librarianId = req.user.id;
  try {
    const record = await query.get('SELECT * FROM borrow_records WHERE id = ?', [id]);
    if (!record || record.status !== 'requested') return res.status(400).json({ success: false });

    const book = await query.get('SELECT title, available_quantity FROM books WHERE id = ?', [record.book_id]);
    if (book.available_quantity <= 0) return res.status(400).json({ success: false, message: 'Out of stock' });

    await query.run('UPDATE books SET available_quantity = available_quantity - 1 WHERE id = ?', [record.book_id]);
    await query.run(`
      UPDATE borrow_records 
      SET status = 'approved', issue_date = datetime('now'), due_date = datetime('now', '+14 days'), librarian_id = ?
      WHERE id = ?
    `, [librarianId, id]);

    await query.run('INSERT INTO Notifications (user_id, message, type) VALUES (?, ?, ?)', [record.student_id, `Your request for book "${book.title}" was approved. Due in 14 days.`, 'book_returned']);
    res.status(200).json({ success: true });
  } catch (e) { res.status(500).json({ success: false }); }
};

exports.rejectBorrow = async (req, res) => {
  try {
    await query.run("UPDATE borrow_records SET status = 'rejected' WHERE id = ?", [req.params.id]);
    res.status(200).json({ success: true });
  } catch (e) { res.status(500).json({ success: false }); }
};

exports.returnBook = async (req, res) => {
  try {
    const rec = await query.get('SELECT * FROM borrow_records WHERE id = ?', [req.params.id]);
    if (!rec || rec.status !== 'approved') return res.status(400).json({ success: false });

    await query.run('UPDATE books SET available_quantity = available_quantity + 1 WHERE id = ?', [rec.book_id]);
    await query.run("UPDATE borrow_records SET status = 'returned', return_date = datetime('now') WHERE id = ?", [req.params.id]);
    res.status(200).json({ success: true });
  } catch (e) { res.status(500).json({ success: false }); }
};

exports.getStudentBorrows = async (req, res) => {
  const userId = req.user.id;
  try {
    const list = await query.all('SELECT br.*, b.title as book_title, b.author FROM borrow_records br JOIN books b ON br.book_id = b.id WHERE br.student_id = ? ORDER BY br.request_date DESC', [userId]);
    res.status(200).json({ success: true, borrows: list });
  } catch (e) { res.status(500).json({ success: false }); }
};

// ==========================================
// 9. NOTIFICATIONS CONTROLLER
// ==========================================

exports.getNotifications = async (req, res) => {
  const userId = req.user.id;
  const { unreadOnly } = req.query;
  try {
    let sql = 'SELECT * FROM Notifications WHERE user_id = ? OR user_id IS NULL';
    const params = [userId];
    if (unreadOnly === 'true') sql += ' AND is_read = 0';
    sql += ' ORDER BY created_at DESC';
    const list = await query.all(sql, params);
    const count = await query.get('SELECT COUNT(*) as count FROM Notifications WHERE (user_id = ? OR user_id IS NULL) AND is_read = 0', [userId]);
    res.status(200).json({ success: true, notifications: list, unreadCount: count.count || 0 });
  } catch (e) { res.status(500).json({ success: false }); }
};

exports.markAsRead = async (req, res) => {
  const userId = req.user.id;
  try {
    await query.run('UPDATE Notifications SET is_read = 1 WHERE user_id = ? OR user_id IS NULL', [userId]);
    res.status(200).json({ success: true });
  } catch (e) { res.status(500).json({ success: false }); }
};

exports.deleteNotification = async (req, res) => {
  try {
    await query.run('DELETE FROM Notifications WHERE id = ? AND (user_id = ? OR user_id IS NULL)', [req.params.id, req.user.id]);
    res.status(200).json({ success: true });
  } catch (e) { res.status(500).json({ success: false }); }
};

exports.clearHistory = async (req, res) => {
  try {
    await query.run('DELETE FROM Notifications WHERE user_id = ? OR user_id IS NULL', [req.user.id]);
    res.status(200).json({ success: true });
  } catch (e) { res.status(500).json({ success: false }); }
};

// ==========================================
// 10. DASHBOARD STATS CONTROLLER
// ==========================================

exports.getStats = async (req, res) => {
  const { id: userId, role } = req.user;
  try {
    const stats = {};
    const notifications = await query.all('SELECT * FROM Notifications WHERE user_id IS NULL OR user_id = ? ORDER BY created_at DESC LIMIT 8', [userId]);

    const studentCount = await query.get("SELECT COUNT(*) as count FROM users WHERE role = 'student'");
    const mockExamsCount = await query.get('SELECT COUNT(*) as count FROM mock_exams');
    const compExamsCount = await query.get('SELECT COUNT(*) as count FROM Exams');
    const bookQty = await query.get('SELECT SUM(quantity) as total, COUNT(*) as count FROM books');
    const activeBorrows = await query.get("SELECT COUNT(*) as count FROM borrow_records WHERE status = 'approved'");
    const notesCount = await query.get('SELECT COUNT(*) as count FROM StudyMaterials');
    const downloadsCount = await query.get('SELECT COUNT(*) as count FROM Downloads');

    stats.counters = {
      totalStudents: studentCount.count || 0,
      totalExams: compExamsCount.count || 0,
      totalMockTests: mockExamsCount.count || 0,
      totalBooks: bookQty.total || 0,
      activeBorrows: activeBorrows.count || 0,
      totalNotes: notesCount.count || 0,
      totalDownloads: downloadsCount.count || 0
    };

    stats.activityTimeline = await query.all(`
      SELECT al.*, u.full_name, u.role
      FROM ActivityLogs al
      JOIN users u ON al.user_id = u.id
      ORDER BY al.created_at DESC LIMIT 10
    `);

    // Chart.js plots
    stats.charts = {
      examPopularity: await query.all('SELECT e.title as label, COUNT(ea.id) as count FROM exam_attempts ea JOIN mock_exams e ON ea.exam_id = e.id GROUP BY ea.exam_id ORDER BY count DESC LIMIT 5'),
      mostDownloadedNotes: await query.all('SELECT title as label, downloads_count as count FROM StudyMaterials ORDER BY downloads_count DESC LIMIT 5'),
      topSubjects: await query.all('SELECT category as label, SUM(quantity) as count FROM books GROUP BY category ORDER BY count DESC LIMIT 5'),
      monthlyActivity: {
        borrows: await query.all("SELECT strftime('%Y-%m', request_date) as month, COUNT(*) as count FROM borrow_records GROUP BY month LIMIT 6"),
        downloads: await query.all("SELECT strftime('%Y-%m', downloaded_at) as month, COUNT(*) as count FROM Downloads GROUP BY month LIMIT 6")
      }
    };

    if (role === 'student') {
      stats.counters.examsAttempted = (await query.get('SELECT COUNT(*) as count FROM exam_attempts WHERE student_id = ?', [userId])).count || 0;
      const avg = await query.get('SELECT AVG(CAST(score AS REAL)/total_questions*100) as avg FROM exam_attempts WHERE student_id = ? AND total_questions>0', [userId]);
      stats.counters.averagePercentage = avg.avg ? Math.round(avg.avg) : 0;
      stats.recentActivity = {
        // FIXED: ea.total_marks replaced with e.total_marks!
        exams: await query.all('SELECT ea.id, e.title as exam_title, e.subject, ea.score, e.total_marks, ea.attempt_date FROM exam_attempts ea JOIN mock_exams e ON ea.exam_id = e.id WHERE ea.student_id = ? ORDER BY ea.attempt_date DESC LIMIT 5', [userId]),
        borrows: await query.all('SELECT br.id, b.title as book_title, br.request_date, br.status FROM borrow_records br JOIN books b ON br.book_id = b.id WHERE br.student_id = ? ORDER BY br.request_date DESC LIMIT 5', [userId])
      };
      stats.charts.scores = await query.all('SELECT e.title as exam_title, (CAST(ea.score as REAL)/ea.total_questions*100) as score_percent FROM exam_attempts ea JOIN mock_exams e ON ea.exam_id = e.id WHERE ea.student_id = ? ORDER BY ea.attempt_date ASC LIMIT 8', [userId]);
    }

    res.status(200).json({ success: true, role, stats, notifications });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server stats error' });
  }
};

exports.exportReport = async (req, res) => {
  const { type } = req.query;
  try {
    let headers = [];
    let rows = [];
    if (type === 'exams') {
      headers = ['ID', 'Exam Name', 'Conducting Authority', 'Level'];
      const list = await query.all('SELECT id, name, conducting_authority, level FROM Exams');
      rows = list.map(e => [e.id, `"${e.name}"`, `"${e.conducting_authority}"`, e.level]);
    } else if (type === 'notes') {
      headers = ['ID', 'Title', 'Category', 'Downloads'];
      const list = await query.all('SELECT id, title, category, downloads_count FROM StudyMaterials');
      rows = list.map(n => [n.id, `"${n.title}"`, n.category, n.downloads_count]);
    } else {
      headers = ['ID', 'Action', 'Timestamp'];
      const list = await query.all('SELECT id, action, created_at FROM ActivityLogs LIMIT 100');
      rows = list.map(l => [l.id, `"${l.action}"`, l.created_at]);
    }
    let csv = headers.join(',') + '\n';
    rows.forEach(r => { csv += r.join(',') + '\n'; });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=report_${type}.csv`);
    res.status(200).send(csv);
  } catch (e) { res.status(500).json({ success: false }); }
};

// ==========================================
// 11. GLOBAL SEARCH CONTROLLER
// ==========================================

exports.globalSearch = async (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(200).json({ success: true, results: { books: [], exams: [], notes: [] } });
  const pat = `%${q}%`;
  try {
    const [books, exams, notes] = await Promise.all([
      query.all('SELECT id, title, author, category FROM books WHERE title LIKE ? OR author LIKE ? LIMIT 5', [pat, pat]),
      query.all('SELECT id, name, conducting_authority FROM Exams WHERE name LIKE ? LIMIT 5', [pat]),
      query.all('SELECT id, title, category FROM StudyMaterials WHERE title LIKE ? LIMIT 5', [pat])
    ]);
    res.status(200).json({ success: true, results: { books, exams, notes, doubts: [], students: [] } });
  } catch (e) { res.status(500).json({ success: false }); }
};
