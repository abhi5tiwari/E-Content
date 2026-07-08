const { initDatabase, query } = require('./db');
const bcrypt = require('bcryptjs');

async function seed() {
  try {
    console.log('Starting database seeding...');
    await initDatabase();

    // 1. Seed Users
    console.log('Seeding users...');
    const existingUsers = await query.get('SELECT COUNT(*) as count FROM users');
    if (existingUsers && existingUsers.count > 0) {
      console.log('Users already seeded, skipping.');
    } else {
      const salt = await bcrypt.genSalt(10);
      const adminPass = await bcrypt.hash('admin123', salt);
      const libPass = await bcrypt.hash('lib123', salt);
      const studPass = await bcrypt.hash('stud123', salt);

      await query.run(
        "INSERT INTO users (username, email, password, role, full_name) VALUES (?, ?, ?, ?, ?)",
        ['admin', 'admin@portal.com', adminPass, 'admin', 'Administrator Staff']
      );
      await query.run(
        "INSERT INTO users (username, email, password, role, full_name) VALUES (?, ?, ?, ?, ?)",
        ['librarian', 'librarian@portal.com', libPass, 'librarian', 'Chief Librarian']
      );
      await query.run(
        "INSERT INTO users (username, email, password, role, full_name) VALUES (?, ?, ?, ?, ?)",
        ['student', 'student@portal.com', studPass, 'student', 'Student Candidate']
      );
      console.log('Users seeded.');
    }

    // 2. Seed Mock Quiz Exams (mock_exams table)
    console.log('Seeding mock practice exams...');
    const exam1 = await query.run(
      'INSERT INTO mock_exams (title, subject, duration_minutes, total_marks, eligibility_criteria) VALUES (?, ?, ?, ?, ?)',
      ['JEE Physics & Chemistry Mock Test', 'Science', 10, 30, 'Class 12 Science PCM students']
    );
    const exam2 = await query.run(
      'INSERT INTO mock_exams (title, subject, duration_minutes, total_marks, eligibility_criteria) VALUES (?, ?, ?, ?, ?)',
      ['NEET Biology Fundamentals', 'Biology', 5, 20, 'Class 12 Science PCB students']
    );
    const exam3 = await query.run(
      'INSERT INTO mock_exams (title, subject, duration_minutes, total_marks, eligibility_criteria) VALUES (?, ?, ?, ?, ?)',
      ['UPSC Civics & History Quiz', 'Social Studies', 15, 30, 'Any graduate (Age 21-32)']
    );
    console.log('Mock practice exams seeded.');

    // 3. Seed Questions
    console.log('Seeding quiz questions...');
    const questions1 = [
      { question_text: 'What is the unit of electrical resistance?', option_a: 'Volt', option_b: 'Ohm', option_c: 'Ampere', option_d: 'Coulomb', correct_option: 'B' },
      { question_text: 'Which of the following has the highest electronegativity?', option_a: 'Oxygen', option_b: 'Nitrogen', option_c: 'Fluorine', option_d: 'Chlorine', correct_option: 'C' },
      { question_text: 'What is the acceleration due to gravity on the Earth surface (approximate)?', option_a: '9.8 m/s²', option_b: '8.9 m/s²', option_c: '10.5 m/s²', option_d: '9.0 m/s²', correct_option: 'A' }
    ];
    for (const q of questions1) {
      await query.run(
        'INSERT INTO questions (exam_id, question_text, option_a, option_b, option_c, option_d, correct_option) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [exam1.id, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d, q.correct_option]
      );
    }

    const questions2 = [
      { question_text: 'Which organelle is commonly called the Powerhouse of the cell?', option_a: 'Golgi Apparatus', option_b: 'Nucleus', option_c: 'Mitochondria', option_d: 'Ribosome', correct_option: 'C' },
      { question_text: 'What is the normal pH level of human blood?', option_a: '6.5', option_b: '7.4', option_c: '8.0', option_d: '7.0', correct_option: 'B' }
    ];
    for (const q of questions2) {
      await query.run(
        'INSERT INTO questions (exam_id, question_text, option_a, option_b, option_c, option_d, correct_option) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [exam2.id, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d, q.correct_option]
      );
    }

    const questions3 = [
      { question_text: 'Who was the first President of India?', option_a: 'Dr. Rajendra Prasad', option_b: 'Jawaharlal Nehru', option_c: 'Dr. B.R. Ambedkar', option_d: 'Mahatma Gandhi', correct_option: 'A' },
      { question_text: 'The concept of Fundamental Rights in the Indian Constitution was borrowed from which country?', option_a: 'United Kingdom', option_b: 'Soviet Union', option_c: 'USA', option_d: 'Canada', correct_option: 'C' }
    ];
    for (const q of questions3) {
      await query.run(
        'INSERT INTO questions (exam_id, question_text, option_a, option_b, option_c, option_d, correct_option) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [exam3.id, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d, q.correct_option]
      );
    }
    console.log('Quiz questions seeded.');

    // 4. Seed Books
    console.log('Seeding library books...');
    const books = [
      { title: 'Concepts of Physics - Vol 1', author: 'H.C. Verma', isbn: '9788177091878', category: 'Physics', quantity: 5, location: 'Shelf A-3' },
      { title: 'Organic Chemistry', author: 'Morrison & Boyd', isbn: '9788131704813', category: 'Chemistry', quantity: 3, location: 'Shelf B-1' },
      { title: 'Objective Biology for NEET', author: 'Dinesh', isbn: '9789352741549', category: 'Biology', quantity: 4, location: 'Shelf C-2' },
      { title: 'Indian Polity', author: 'M. Laxmikanth', isbn: '9789352603632', category: 'Civics', quantity: 6, location: 'Shelf D-4' },
      { title: 'Cracking the Coding Interview', author: 'Gayle L. McDowell', isbn: '9780984782857', category: 'Computer Science', quantity: 4, location: 'Shelf E-2' }
    ];
    for (const b of books) {
      await query.run(
        'INSERT INTO books (title, author, isbn, category, quantity, available_quantity, location) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [b.title, b.author, b.isbn, b.category, b.quantity, b.quantity, b.location]
      );
    }
    console.log('Books seeded.');

    // ==================== SEED NEW MODULES DATA ====================

    // 5. Seed ExamCategories
    console.log('Seeding Exam Categories...');
    const cat1 = await query.run("INSERT INTO ExamCategories (name) VALUES ('Government Exams')");
    const cat2 = await query.run("INSERT INTO ExamCategories (name) VALUES ('Banking Exams')");
    const cat3 = await query.run("INSERT INTO ExamCategories (name) VALUES ('Engineering Entrance')");
    const cat4 = await query.run("INSERT INTO ExamCategories (name) VALUES ('MBA Entrance')");
    const cat5 = await query.run("INSERT INTO ExamCategories (name) VALUES ('Law Entrance')");
    await query.run("INSERT INTO ExamCategories (name) VALUES ('Railway Exams')");
    await query.run("INSERT INTO ExamCategories (name) VALUES ('SSC Exams')");
    await query.run("INSERT INTO ExamCategories (name) VALUES ('UPSC')");
    await query.run("INSERT INTO ExamCategories (name) VALUES ('Defence Exams')");
    await query.run("INSERT INTO ExamCategories (name) VALUES ('Police Exams')");
    await query.run("INSERT INTO ExamCategories (name) VALUES ('State PSC')");
    await query.run("INSERT INTO ExamCategories (name) VALUES ('Teaching Exams')");
    await query.run("INSERT INTO ExamCategories (name) VALUES ('Medical Entrance')");
    await query.run("INSERT INTO ExamCategories (name) VALUES ('Private Company Recruitment')");

    // 6. Seed Competitive Exams (Exams table)
    console.log('Seeding Competitive Exams...');
    
    // UPSC Civil Services
    const cExam1 = await query.run(`
      INSERT INTO Exams (
        name, category_id, short_description, conducting_authority, official_website,
        eligibility, age_limit, educational_qualification, num_attempts, level,
        application_fee, exam_pattern, selection_process, syllabus_overview, subjects,
        cutoff_previous_year, job_profile, salary, career_growth, promotion,
        preparation_tips, important_dates, admit_card_status, result_status, faq
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      'UPSC Civil Services Examination (IAS/IPS)', cat1.id,
      'The premier national exam to recruit elite civil servants like IAS, IPS, and IFS officers.',
      'Union Public Service Commission (UPSC)', 'https://upsc.gov.in',
      'Indian citizens matching age limits.', '21 - 32 years (Relaxations apply)',
      'Graduate degree in any discipline from a recognized university.', '6 attempts for general category',
      'National', 'INR 100 for General/OBC, free for Female/SC/ST',
      'Prelims (objective MCQs), Mains (descriptive papers), Interview (personality test)',
      'Direct selection based on Mains + Interview cumulative score ranking.',
      'Prelims covers GS & CSAT. Mains covers Essay, General Studies papers, and optional subjects.',
      'History, Geography, Polity, Economics, Environment, Aptitude',
      'Prelims: 88.22 marks (2023 General), Mains: 741 marks (2023 General)',
      'Administration, Law and Order enforcement, foreign diplomacy representation.',
      'Starting Basic Pay of INR 56,100 per month (Level 10) plus DA, HRA, and perks.',
      'Structured promotion scale reaching Chief Secretary level or Cabinet Secretary.',
      'Promotion to senior grades based on tenure guidelines and review evaluations.',
      'Read newspapers daily, analyze previous papers, write regular essays.',
      'Prelims: Oct 2026, Mains: Feb 2027', 'Awaited', 'Announced',
      JSON.stringify([
        { question: 'What is the eligibility for UPSC?', answer: 'You must hold a graduation degree and be between 21 and 32 years of age.' },
        { question: 'Are there negative marks in Prelims?', answer: 'Yes, 1/3rd of the marks assigned to a question are deducted for wrong answers.' }
      ])
    ]);

    // GATE CS
    const cExam2 = await query.run(`
      INSERT INTO Exams (
        name, category_id, short_description, conducting_authority, official_website,
        eligibility, age_limit, educational_qualification, num_attempts, level,
        application_fee, exam_pattern, selection_process, syllabus_overview, subjects,
        cutoff_previous_year, job_profile, salary, career_growth, promotion,
        preparation_tips, important_dates, admit_card_status, result_status, faq
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      'GATE Computer Science (CS)', cat3.id,
      'National graduate engineering aptitude test for PG admissions and PSU recruitment.',
      'Indian Institute of Science (IISc) / IITs', 'https://gate2026.iit.ac.in',
      'Graduating engineering students or degree holders.', 'No age limit restrictions',
      'B.E. / B.Tech / MCA / M.Sc computer science degree or pre-final year students.', 'Unlimited attempts',
      'National', 'INR 1800 for General category',
      'Single paper of 3 hours with 65 multiple choice and numerical answer questions.',
      'Rank scores normalized. PG admission or PSU interview calls based on GATE rank.',
      'Covers Mathematics, General Aptitude, and Core Computer Science concepts.',
      'Engineering Mathematics, Data Structures, Algorithms, Networks, OS, DBMS',
      'GATE CS 2023 Cutoff: 32.5 marks out of 100 for General Category.',
      'Research scholar, Software Architect, PSU Executive Engineer.',
      'Stipend of INR 12,400 during M.Tech. PSU starting pay packages up to 18 LPA.',
      'Higher designations in PSU research departments or IT corporations.',
      'Promotion based on tenure, technical skills, and research papers published.',
      'Solve previous 20 years papers, practice mock tests daily, study discrete math.',
      'Exam Dates: Feb 2026', 'Released', 'Declared',
      JSON.stringify([
        { question: 'Is calculator allowed in GATE?', answer: 'A virtual on-screen scientific calculator is provided during the exam.' },
        { question: 'What is the validity of GATE score?', answer: 'The GATE score is valid for 3 years from the date of announcement of results.' }
      ])
    ]);

    // 7. Seed Subjects, Units, and Topics for Syllabus Tracker
    console.log('Seeding Syllabus structures...');
    
    // Subjects for UPSC
    const subU1 = await query.run('INSERT INTO Subjects (exam_id, name) VALUES (?, ?)', [cExam1.id, 'Indian Polity & Constitution']);
    const subU2 = await query.run('INSERT INTO Subjects (exam_id, name) VALUES (?, ?)', [cExam1.id, 'Indian History & Movement']);
    
    // Units for Polity
    const unitP1 = await query.run('INSERT INTO Units (subject_id, name) VALUES (?, ?)', [subU1.id, 'Fundamental Rights & Duties']);
    const unitP2 = await query.run('INSERT INTO Units (subject_id, name) VALUES (?, ?)', [subU1.id, 'Parliament & Executive']);
    
    // Topics for Rights
    await query.run('INSERT INTO Topics (unit_id, name, weightage, difficulty, prep_time) VALUES (?, ?, ?, ?, ?)', [unitP1.id, 'Article 14 - Right to Equality', 'High - 2 Questions', 'Medium', '4 Hours']);
    await query.run('INSERT INTO Topics (unit_id, name, weightage, difficulty, prep_time) VALUES (?, ?, ?, ?, ?)', [unitP1.id, 'Article 21 - Right to Life & Personal Liberty', 'High', 'Hard', '5 Hours']);
    await query.run('INSERT INTO Topics (unit_id, name, weightage, difficulty, prep_time) VALUES (?, ?, ?, ?, ?)', [unitP1.id, 'Directive Principles of State Policy', 'Medium', 'Easy', '3 Hours']);
    
    // Topics for Parliament
    await query.run('INSERT INTO Topics (unit_id, name, weightage, difficulty, prep_time) VALUES (?, ?, ?, ?, ?)', [unitP2.id, 'Powers of President & Prime Minister', 'High', 'Medium', '6 Hours']);
    await query.run('INSERT INTO Topics (unit_id, name, weightage, difficulty, prep_time) VALUES (?, ?, ?, ?, ?)', [unitP2.id, 'Lok Sabha vs Rajya Sabha procedures', 'Medium', 'Easy', '4 Hours']);

    // Subjects for GATE CS
    const subG1 = await query.run('INSERT INTO Subjects (exam_id, name) VALUES (?, ?)', [cExam2.id, 'Data Structures & Algorithms']);
    const subG2 = await query.run('INSERT INTO Subjects (exam_id, name) VALUES (?, ?)', [cExam2.id, 'Databases (DBMS)']);

    // Units for DS&A
    const unitD1 = await query.run('INSERT INTO Units (subject_id, name) VALUES (?, ?)', [subG1.id, 'Sorting Algorithms']);
    const unitD2 = await query.run('INSERT INTO Units (subject_id, name) VALUES (?, ?)', [subG1.id, 'Binary Trees & Graphs']);

    // Topics for Sorting
    await query.run('INSERT INTO Topics (unit_id, name, weightage, difficulty, prep_time) VALUES (?, ?, ?, ?, ?)', [unitD1.id, 'QuickSort and MergeSort complexities', 'High - 1 MCQ', 'Medium', '3 Hours']);
    await query.run('INSERT INTO Topics (unit_id, name, weightage, difficulty, prep_time) VALUES (?, ?, ?, ?, ?)', [unitD1.id, 'Stable Sorting criteria and HeapSort', 'Medium', 'Easy', '2 Hours']);

    // Topics for Trees
    await query.run('INSERT INTO Topics (unit_id, name, weightage, difficulty, prep_time) VALUES (?, ?, ?, ?, ?)', [unitD2.id, 'Binary Search Tree operations and AVL trees', 'High', 'Hard', '4 Hours']);

    // 8. Seed Notifications
    console.log('Seeding initial alerts...');
    await query.run(
      "INSERT INTO Notifications (message, type) VALUES (?, ?)",
      ['Welcome to the extended Competitive Exam Preparation Portal! Check out the syllabus progress tracker.', 'announcement']
    );
    await query.run(
      "INSERT INTO Notifications (message, type) VALUES (?, ?)",
      ['New Study Material: Physics Formula Sheet has been uploaded by Administrator.', 'notes_uploaded']
    );

    console.log('Database seeding finished successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Error seeding database:', err);
    process.exit(1);
  }
}

seed();
