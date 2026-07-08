const express = require('express');
const router = express.Router();
const portalController = require('../controllers/portalController');
const upload = require('../middleware/uploadMiddleware');
const { authenticateJWT, verifyRole } = require('../middleware/authMiddleware');

// ==========================================
// 1. AUTHENTICATION ENDPOINTS
// ==========================================
router.post('/auth/register', portalController.register);
router.post('/auth/login', portalController.login);
router.post('/auth/logout', portalController.logout);
router.get('/auth/me', authenticateJWT, portalController.getCurrentUser);

// ==========================================
// 2. USER MANAGER ENDPOINTS
// ==========================================
router.get('/users', authenticateJWT, verifyRole('admin'), portalController.getUsers);
router.post('/users', authenticateJWT, verifyRole('admin'), portalController.createUser);
router.put('/users/:id', authenticateJWT, verifyRole('admin'), portalController.updateUser);
router.delete('/users/:id', authenticateJWT, verifyRole('admin'), portalController.deleteUser);

// ==========================================
// 3. MOCK EXAMS ENDPOINTS
// ==========================================
router.get('/exams', authenticateJWT, portalController.getExams);
router.get('/exams/attempts', authenticateJWT, portalController.getAttempts);
router.get('/exams/:id', authenticateJWT, portalController.getExamDetails);
router.post('/exams/submit', authenticateJWT, verifyRole('student'), portalController.submitExam);
router.post('/exams', authenticateJWT, verifyRole('admin'), portalController.createExam);
router.delete('/exams/:id', authenticateJWT, verifyRole('admin'), portalController.deleteExam);

// ==========================================
// 4. COMPETITIVE EXAMS ENDPOINTS
// ==========================================
router.get('/competitive-exams', authenticateJWT, portalController.getCompExams);
router.get('/competitive-exams/categories', authenticateJWT, portalController.getCompCategories);
router.get('/competitive-exams/:id', authenticateJWT, portalController.getCompExamDetails);
router.post('/competitive-exams', authenticateJWT, verifyRole('admin'), portalController.createCompExam);
router.put('/competitive-exams/:id', authenticateJWT, verifyRole('admin'), portalController.updateCompExam);
router.delete('/competitive-exams/:id', authenticateJWT, verifyRole('admin'), portalController.deleteCompExam);

// ==========================================
// 5. SYLLABUS TRACKER ENDPOINTS
// ==========================================
router.get('/syllabus/exam/:examId', authenticateJWT, portalController.getSyllabus);
router.get('/syllabus/exam/:examId/progress', authenticateJWT, portalController.getSyllabusProgress);
router.post('/syllabus/toggle', authenticateJWT, portalController.toggleTopicStatus);
router.post('/syllabus/subject', authenticateJWT, verifyRole('admin'), portalController.addSubject);
router.post('/syllabus/unit', authenticateJWT, verifyRole('admin'), portalController.addUnit);
router.post('/syllabus/topic', authenticateJWT, verifyRole('admin'), portalController.addTopic);
router.delete('/syllabus/subject/:id', authenticateJWT, verifyRole('admin'), portalController.deleteSubject);
router.delete('/syllabus/unit/:id', authenticateJWT, verifyRole('admin'), portalController.deleteUnit);
router.delete('/syllabus/topic/:id', authenticateJWT, verifyRole('admin'), portalController.deleteTopic);

// ==========================================
// 6. STUDY MATERIALS ENDPOINTS
// ==========================================
router.get('/study-materials', authenticateJWT, portalController.getStudyMaterials);
router.get('/study-materials/bookmarks', authenticateJWT, portalController.getBookmarkedMaterials);
router.get('/study-materials/stats', authenticateJWT, portalController.getStorageStats);
router.get('/study-materials/download/:id', authenticateJWT, portalController.downloadStudyMaterial);
router.post('/study-materials/upload', authenticateJWT, upload.single('file'), portalController.uploadStudyMaterial);
router.post('/study-materials/bookmark', authenticateJWT, portalController.toggleBookmark);
router.post('/study-materials/like', authenticateJWT, portalController.toggleLike);
router.post('/study-materials/rate', authenticateJWT, portalController.rateMaterial);
router.post('/study-materials/replace/:id', authenticateJWT, verifyRole('admin'), upload.single('file'), portalController.replaceStudyMaterial);
router.delete('/study-materials/:id', authenticateJWT, verifyRole('admin'), portalController.deleteStudyMaterial);

// ==========================================
// 7. DOUBT DISCUSSION FORUM ENDPOINTS
// ==========================================
router.get('/doubts', authenticateJWT, portalController.getDoubts);
router.get('/doubts/:id', authenticateJWT, portalController.getDoubtDetails);
router.post('/doubts/ask', authenticateJWT, portalController.askDoubt);
router.post('/doubts/reply', authenticateJWT, portalController.replyToDoubt);
router.post('/doubts/upvote', authenticateJWT, portalController.toggleUpvote);
router.post('/doubts/solved', authenticateJWT, portalController.markAsSolved);
router.post('/doubts/lock', authenticateJWT, verifyRole('admin'), portalController.lockDiscussion);
router.post('/doubts/pin', authenticateJWT, verifyRole('admin'), portalController.pinDoubt);
router.delete('/doubts/:id', authenticateJWT, verifyRole('admin'), portalController.deleteDoubt);

// ==========================================
// 8. LIBRARY INVENTORY ENDPOINTS
// ==========================================
router.get('/library/books', authenticateJWT, portalController.getBooks);
router.post('/library/books', authenticateJWT, verifyRole(['librarian', 'admin']), portalController.addBook);
router.put('/library/books/:id', authenticateJWT, verifyRole(['librarian', 'admin']), portalController.updateBook);
router.delete('/library/books/:id', authenticateJWT, verifyRole(['librarian', 'admin']), portalController.deleteBook);
router.get('/library/borrows', authenticateJWT, verifyRole(['librarian', 'admin']), portalController.getBorrowRequests);
router.post('/library/borrows/request', authenticateJWT, verifyRole('student'), portalController.requestBook);
router.post('/library/borrows/approve/:id', authenticateJWT, verifyRole(['librarian', 'admin']), portalController.approveBorrow);
router.post('/library/borrows/reject/:id', authenticateJWT, verifyRole(['librarian', 'admin']), portalController.rejectBorrow);
router.post('/library/borrows/return/:id', authenticateJWT, verifyRole(['librarian', 'admin']), portalController.returnBook);
router.get('/library/borrows/student', authenticateJWT, verifyRole('student'), portalController.getStudentBorrows);

// ==========================================
// 9. NOTIFICATIONS ENDPOINTS
// ==========================================
router.get('/notifications', authenticateJWT, portalController.getNotifications);
router.post('/notifications/read', authenticateJWT, portalController.markAsRead);
router.delete('/notifications/clear', authenticateJWT, portalController.clearHistory);
router.delete('/notifications/:id', authenticateJWT, portalController.deleteNotification);

// ==========================================
// 10. DASHBOARD STATS ENDPOINTS
// ==========================================
router.get('/dashboard/stats', authenticateJWT, portalController.getStats);
router.get('/dashboard/export', authenticateJWT, portalController.exportReport);

// ==========================================
// 11. GLOBAL SEARCH ENDPOINT
// ==========================================
router.get('/search', authenticateJWT, portalController.globalSearch);

module.exports = router;
