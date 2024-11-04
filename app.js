const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const mysql = require('mysql2/promise');
const multer = require('multer');
const app = express();

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieParser());
app.set('view engine', 'ejs');

// Multer setup for file uploads
const upload = multer({ dest: 'uploads/' });

let connection;

async function initializeDatabase() {
  connection = await mysql.createConnection({
    host: '127.0.0.1',
    port: 3306,
    user: 'wpr',
    password: 'fit123',
    database: 'wpr2201040165'
  });
}

initializeDatabase();

// Middleware to check if user is authenticated
const isAuthenticated = async (req, res, next) => {
  const userId = req.cookies.userId;
  if (userId) {
    try {
      const [user] = await connection.query('SELECT * FROM users WHERE id = ?', [userId]);
      if (user.length > 0) {
        req.user = user[0];
        return next();
      }
    } catch (error) {
      console.error('Authentication error:', error);
    }
  }
  res.redirect('/');
};

// ... (other routes remain unchanged)

// Add this new route for deleting emails
app.post('/delete-emails', isAuthenticated, async (req, res) => {
  const { emailIds } = req.body;
  const userId = req.user.id;

  try {
    // Update the emails table to mark emails as deleted for the current user
    await connection.query(
      `UPDATE emails SET 
       deleted_by_sender = CASE WHEN sender_id = ? THEN 1 ELSE deleted_by_sender END,
       deleted_by_recipient = CASE WHEN recipient_id = ? THEN 1 ELSE deleted_by_recipient END
       WHERE id IN (?)`,
      [userId, userId, emailIds]
    );

    res.json({ success: true, message: 'Emails deleted successfully' });
  } catch (error) {
    console.error('Error deleting emails:', error);
    res.status(500).json({ success: false, message: 'An error occurred while deleting emails' });
  }
});

// ... (other routes remain unchanged)

// Start server
app.listen(8000, () => {
  console.log('Server running on http://localhost:8000');
});