const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const { initDatabase } = require('./database/db');

// Import consolidated routes
const portalRoutes = require('./routes/portal');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve static assets from public folder
app.use(express.static(path.join(__dirname, 'public')));

// Mount API routes
app.use('/api', portalRoutes);

// Fallback HTML router for frontend page requests
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Internal Server Error' });
});

// Initialize database and start server
async function startServer() {
  await initDatabase();
  app.listen(PORT, () => {
    console.log(`=================================================`);
    console.log(`Server is running offline at http://localhost:${PORT}`);
    console.log(`Default users available for test:`);
    console.log(`- Admin: username: "admin", password: "admin123"`);
    console.log(`- Librarian: username: "librarian", password: "lib123"`);
    console.log(`- Student: username: "student", password: "stud123"`);
    console.log(`=================================================`);
  });
}

startServer();
