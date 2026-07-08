const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'portal.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Could not connect to SQLite database:', err);
  } else {
    console.log('Connected to SQLite database at:', dbPath);
    db.run('PRAGMA foreign_keys = ON;', (err) => {
      if (err) console.error('Failed to enable foreign keys:', err);
    });
  }
});

// Helper functions to wrap sqlite3 in Promises
const query = {
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, changes: this.changes });
      });
    });
  },
  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },
  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
};

// Initialize Tables
async function initDatabase() {
  try {
    // 1. Users Table
    await query.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT CHECK(role IN ('admin', 'student', 'librarian')) NOT NULL,
        full_name TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. Books Table
    await query.run(`
      CREATE TABLE IF NOT EXISTS books (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        author TEXT NOT NULL,
        isbn TEXT UNIQUE NOT NULL,
        category TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        available_quantity INTEGER NOT NULL,
        location TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 3. Borrow Records Table
    await query.run(`
      CREATE TABLE IF NOT EXISTS borrow_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        book_id INTEGER NOT NULL,
        student_id INTEGER NOT NULL,
        request_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        status TEXT CHECK(status IN ('requested', 'approved', 'rejected', 'returned')) DEFAULT 'requested',
        issue_date DATETIME,
        due_date DATETIME,
        return_date DATETIME,
        librarian_id INTEGER,
        FOREIGN KEY (book_id) REFERENCES books (id) ON DELETE CASCADE,
        FOREIGN KEY (student_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (librarian_id) REFERENCES users (id) ON DELETE SET NULL
      )
    `);

    // 4. Mock Exams Table (renamed from exams to prevent clashes)
    await query.run(`
      CREATE TABLE IF NOT EXISTS mock_exams (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        subject TEXT NOT NULL,
        duration_minutes INTEGER NOT NULL,
        total_marks INTEGER NOT NULL,
        eligibility_criteria TEXT DEFAULT 'Open to all students',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 5. Questions Table (linked to mock_exams)
    await query.run(`
      CREATE TABLE IF NOT EXISTS questions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        exam_id INTEGER NOT NULL,
        question_text TEXT NOT NULL,
        option_a TEXT NOT NULL,
        option_b TEXT NOT NULL,
        option_c TEXT NOT NULL,
        option_d TEXT NOT NULL,
        correct_option TEXT CHECK(correct_option IN ('A', 'B', 'C', 'D')) NOT NULL,
        FOREIGN KEY (exam_id) REFERENCES mock_exams (id) ON DELETE CASCADE
      )
    `);

    // 6. Exam Attempts Table (linked to mock_exams)
    await query.run(`
      CREATE TABLE IF NOT EXISTS exam_attempts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL,
        exam_id INTEGER NOT NULL,
        score INTEGER NOT NULL,
        total_questions INTEGER NOT NULL,
        correct_answers INTEGER NOT NULL,
        attempt_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (exam_id) REFERENCES mock_exams (id) ON DELETE CASCADE
      )
    `);

    // ==================== NEW EXTENDED MODULE TABLES ====================

    // 7. ExamCategories Table
    await query.run(`
      CREATE TABLE IF NOT EXISTS ExamCategories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL
      )
    `);

    // 8. Exams Table (Competitive Exam Information)
    await query.run(`
      CREATE TABLE IF NOT EXISTS Exams (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        category_id INTEGER NOT NULL,
        short_description TEXT,
        conducting_authority TEXT,
        official_website TEXT,
        eligibility TEXT,
        age_limit TEXT,
        educational_qualification TEXT,
        num_attempts TEXT,
        level TEXT CHECK(level IN ('National', 'State')) DEFAULT 'National',
        application_fee TEXT,
        exam_pattern TEXT,
        selection_process TEXT,
        syllabus_overview TEXT,
        subjects TEXT,
        cutoff_previous_year TEXT,
        job_profile TEXT,
        salary TEXT,
        career_growth TEXT,
        promotion TEXT,
        preparation_tips TEXT,
        important_dates TEXT,
        admit_card_status TEXT,
        result_status TEXT,
        faq TEXT, -- JSON array string
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES ExamCategories (id) ON DELETE CASCADE
      )
    `);

    // 9. Subjects Table
    await query.run(`
      CREATE TABLE IF NOT EXISTS Subjects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        exam_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        FOREIGN KEY (exam_id) REFERENCES Exams (id) ON DELETE CASCADE
      )
    `);

    // 10. Units Table
    await query.run(`
      CREATE TABLE IF NOT EXISTS Units (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        subject_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        FOREIGN KEY (subject_id) REFERENCES Subjects (id) ON DELETE CASCADE
      )
    `);

    // 11. Topics Table
    await query.run(`
      CREATE TABLE IF NOT EXISTS Topics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        unit_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        weightage TEXT,
        difficulty TEXT CHECK(difficulty IN ('Easy', 'Medium', 'Hard')) DEFAULT 'Medium',
        prep_time TEXT,
        FOREIGN KEY (unit_id) REFERENCES Units (id) ON DELETE CASCADE
      )
    `);

    // 12. TopicProgress Table
    await query.run(`
      CREATE TABLE IF NOT EXISTS TopicProgress (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL,
        topic_id INTEGER NOT NULL,
        status INTEGER DEFAULT 0, -- 0: Incomplete, 1: Completed
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (topic_id) REFERENCES Topics (id) ON DELETE CASCADE,
        UNIQUE(student_id, topic_id)
      )
    `);

    // 13. StudyMaterials Table
    await query.run(`
      CREATE TABLE IF NOT EXISTS StudyMaterials (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        category TEXT NOT NULL,
        filename TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        uploaded_by INTEGER,
        uploaded_by_name TEXT,
        exam_id INTEGER,
        subject_id INTEGER,
        downloads_count INTEGER DEFAULT 0,
        likes_count INTEGER DEFAULT 0,
        rating_sum INTEGER DEFAULT 0,
        rating_count INTEGER DEFAULT 0,
        uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (uploaded_by) REFERENCES users (id) ON DELETE SET NULL,
        FOREIGN KEY (exam_id) REFERENCES Exams (id) ON DELETE SET NULL,
        FOREIGN KEY (subject_id) REFERENCES Subjects (id) ON DELETE SET NULL
      )
    `);

    // 14. Downloads Table (log logs)
    await query.run(`
      CREATE TABLE IF NOT EXISTS Downloads (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        material_id INTEGER NOT NULL,
        downloaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (material_id) REFERENCES StudyMaterials (id) ON DELETE CASCADE
      )
    `);

    // 15. Bookmarks Table
    await query.run(`
      CREATE TABLE IF NOT EXISTS Bookmarks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        material_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (material_id) REFERENCES StudyMaterials (id) ON DELETE CASCADE,
        UNIQUE(user_id, material_id)
      )
    `);

    // 16. Material Likes Table (internal tracker)
    await query.run(`
      CREATE TABLE IF NOT EXISTS MaterialLikes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        material_id INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (material_id) REFERENCES StudyMaterials (id) ON DELETE CASCADE,
        UNIQUE(user_id, material_id)
      )
    `);

    // 17. Material Ratings Table (internal tracker)
    await query.run(`
      CREATE TABLE IF NOT EXISTS MaterialRatings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        material_id INTEGER NOT NULL,
        rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (material_id) REFERENCES StudyMaterials (id) ON DELETE CASCADE,
        UNIQUE(user_id, material_id)
      )
    `);

    // 18. Doubts Table
    await query.run(`
      CREATE TABLE IF NOT EXISTS Doubts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        user_name TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        exam_id INTEGER,
        subject_id INTEGER,
        is_solved INTEGER DEFAULT 0, -- 0: Unsolved, 1: Solved
        is_pinned INTEGER DEFAULT 0, -- 0: No, 1: Yes
        is_locked INTEGER DEFAULT 0, -- 0: No, 1: Yes
        upvotes_count INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (exam_id) REFERENCES Exams (id) ON DELETE SET NULL,
        FOREIGN KEY (subject_id) REFERENCES Subjects (id) ON DELETE SET NULL
      )
    `);

    // 19. Replies Table
    await query.run(`
      CREATE TABLE IF NOT EXISTS Replies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        doubt_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        user_name TEXT NOT NULL,
        message TEXT NOT NULL,
        is_admin_reply INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (doubt_id) REFERENCES Doubts (id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )
    `);

    // 20. Doubt Upvotes Table
    await query.run(`
      CREATE TABLE IF NOT EXISTS DoubtVotes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        doubt_id INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (doubt_id) REFERENCES Doubts (id) ON DELETE CASCADE,
        UNIQUE(user_id, doubt_id)
      )
    `);

    // 21. Notifications Table (extended columns)
    await query.run(`
      CREATE TABLE IF NOT EXISTS Notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER, -- NULL means global announcement
        message TEXT NOT NULL,
        type TEXT DEFAULT 'announcement', -- upcoming_exam, notes_uploaded, book_due, forum_reply, etc.
        is_read INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )
    `);

    // 22. Uploads Table (centralized files logs)
    await query.run(`
      CREATE TABLE IF NOT EXISTS Uploads (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT NOT NULL,
        original_name TEXT NOT NULL,
        mime_type TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        uploaded_by INTEGER,
        uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (uploaded_by) REFERENCES users (id) ON DELETE SET NULL
      )
    `);

    // 23. ActivityLogs Table
    await query.run(`
      CREATE TABLE IF NOT EXISTS ActivityLogs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        action TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )
    `);

    console.log('All database tables initialized successfully.');
  } catch (err) {
    console.error('Error initializing database tables:', err);
  }
}

module.exports = {
  db,
  query,
  initDatabase
};
