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
      if (user.length !== 0) {
        req.user = user[0];
        return next();
      }
    } catch (error) {
      console.error('Authentication error:', error);
    }
  }
  res.status(403).render('denied-page');
};

// Homepage (Sign-in page)
app.get('/', async (req, res) => {
  const userId = req.cookies.userId;
  if (userId) {
    return res.redirect('/inbox/' + userId);
  }
  res.render('sign-in', { error: null });
});

// Handle Sign-in
app.post('/', async (req, res) => {
  const { email, password } = req.body;
  try {
    const [user] = await connection.query('SELECT * FROM users WHERE email = ? AND password = ?', [email, password]);
    if (user.length != 0) {
      
      res.cookie('userId', user[0].id);
      return res.redirect('/inbox/' + user[0].id);
    } else {
      res.render('sign-in', { error: 'Invalid email or password' });
    }
  } catch (error) {
    console.error('Sign-in error:', error);
    res.render('sign-in', { error: 'An error occurred. Please try again.' });
  }
});

// Sign-up page
app.get('/sign-up', (req, res) => {
  res.render('sign-up', { error: null });
});

// Handle Sign-up
app.post('/sign-up', async (req, res) => {
  const { fullName, email, password, rePassword } = req.body;

  if (!fullName || !email || !password || !rePassword) {
    return res.render('sign-up', { error: 'All fields are required' });
  }

  if (password.length < 6) {
    return res.render('sign-up', { error: 'Password must be at least 6 characters long' });
  }

  if (password !== rePassword) {
    return res.render('sign-up', { error: 'Passwords do not match' });
  }

  try {
    const [existingUser] = await connection.query('SELECT * FROM users WHERE email = ?', [email]);
    if (existingUser.length > 0) {
      return res.render('sign-up', { error: 'Email address is already in use' });
    }

    await connection.query('INSERT INTO users (full_name, email, password) VALUES (?, ?, ?)', [fullName, email, password]);
    res.render('sign-up-success');
  } catch (error) {
    console.error('Sign-up error:', error);
    res.render('sign-up', { error: 'An error occurred. Please try again.' });
  }
});

// Inbox page
app.get('/inbox/:userId', isAuthenticated, async (req, res) => {
  const currentPage = parseInt(req.query.page) || 1;
  const limit = 5;
  const offset = (currentPage - 1) * limit;

  try {
    const [emails] = await connection.query(
      `SELECT e.*, u.full_name  
       FROM emails e 
       JOIN users u ON e.sender_id = u.id 
       WHERE e.recipient_id = ? 
       ORDER BY e.sent_at DESC 
       LIMIT ? OFFSET ?`,
      [req.params.userId, limit, offset]
    );
    

    const [totalEmails] = await connection.query(
      'SELECT COUNT(*) as count FROM emails WHERE recipient_id = ?',
      [req.params.userId]
    );

    const totalPages = Math.ceil(totalEmails[0].count / limit);

    res.render('inbox', {
      user: req.user,
      emails,
      currentPage: currentPage,
      totalPages
    });
  } catch (error) {
    console.error('Inbox error:', error);
    res.status(500).send('An error occurred while fetching emails');
  }
});

// Outbox page
app.get('/outbox/:userId', isAuthenticated, async (req, res) => {
  const currentPage = parseInt(req.query.page) || 1;
  const limit = 5;
  const offset = (currentPage - 1) * limit;

  try {
    const [emails] = await connection.query(
      `SELECT e.*, u.full_name 
       FROM emails e 
       JOIN users u ON e.recipient_id = u.id 
       WHERE e.sender_id = ? 
       ORDER BY e.sent_at DESC 
       LIMIT ? OFFSET ?`,
      [req.params.userId, limit, offset]
    );

    const [totalEmails] = await connection.query(
      'SELECT COUNT(*) as count FROM emails WHERE sender_id = ?',
      [req.params.userId]
    );

    const totalPages = Math.ceil(totalEmails[0].count / limit);

    res.render('outbox', {
      user: req.user,
      emails,
      currentPage: currentPage,
      totalPages
    });
  } catch (error) {
    console.error('Outbox error:', error);
    res.status(500).send('An error occurred while fetching emails');
  }
});

// Compose page
app.get('/compose/:userId', isAuthenticated, async (req, res) => {
  try {
    const [users] = await connection.query('SELECT id, full_name, email FROM users WHERE id != ?', [req.user.id]);
    res.render('compose', { user: req.user, recipients: users, error: null });
  } catch (error) {
    console.error('Compose page error:', error);
    res.status(500).send('An error occurred while loading the compose page');
  }
});

// Handle email composition
app.post('/compose/:userId', isAuthenticated, upload.single('attachment'), async (req, res) => {
  const { recipient, subject, body } = req.body;
  const attachment = req.file ? req.file.filename : null;
  try {
    const [receiver] = await  connection.query('SELECT id FROM users WHERE email = ?', [recipient]);
    if (receiver. length === 0){
      return res.render('compose', {
        user: req.user,
        error: 'Please enter an existed recipient'
      });
    }
 
    await connection.query(
      'INSERT INTO emails (sender_id, recipient_id, subject, body, attachment) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, recipient, subject || '(no subject)', body, attachment]
    );
    res.redirect('/outbox');
  } catch (error) {
    console.error('Email sending error:', error);
    res.status(500).send('An error occurred while sending the email');
  }
});

// Email detail page
app.get('/email/:id', isAuthenticated, async (req, res) => {
  try {
    const [email] = await connection.query(
      `SELECT e.*, 
        sender.full_name AS sender_name, 
        recipient.full_name AS recipient_name 
       FROM emails e 
       JOIN users sender ON e.sender_id = sender.id 
       JOIN users recipient ON e.recipient_id = recipient.id 
       WHERE e.id = ? AND (e.sender_id = ? OR e.recipient_id = ?)`,
      [req.params.id, req.user.id, req.user.id]
    );

    if (email.length === 0) {
      return res.status(404).send('Email not found');
    }

    res.render('email-detail', { user: req.user, email: email[0] });
  } catch (error) {
    console.error('Email detail error:', error);
    res.status(500).send('An error occurred while fetching the email');
  }
});

// Logout route
app.get('/logout', (req, res) => {
  res.clearCookie('userId');
  res.redirect('/');
});

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

// Update the inbox route to exclude deleted emails
app.get('/inbox', isAuthenticated, async (req, res) => {
  const currentPage = parseInt(req.query.page) || 1;
  const limit = 5;
  const offset = (currentPage - 1) * limit;

  try {
    const [emails] = await connection.query(
      `SELECT e.*, u.full_name AS sender_name 
       FROM emails e 
       JOIN users u ON e.sender_id = u.id 
       WHERE e.recipient_id = ? AND e.deleted_by_recipient = 0
       ORDER BY e.sent_at DESC 
       LIMIT ? OFFSET ?`,
      [req.user.id, limit, offset]
    );

    const [totalEmails] = await connection.query(
      'SELECT COUNT(*) as count FROM emails WHERE recipient_id = ? AND deleted_by_recipient = 0',
      [req.user.id]
    );

    const totalPages = Math.ceil(totalEmails[0].count / limit);

    res.render('inbox', {
      user: req.user,
      emails,
      currentPage: currentPage,
      totalPages
    });
  } catch (error) {
    console.error('Inbox error:', error);
    res.status(500).send('An error occurred while fetching emails');
  }
});

// Update the outbox route to exclude deleted emails
app.get('/outbox', isAuthenticated, async (req, res) => {
  const currentPage = parseInt(req.query.page) || 1;
  const limit = 5;
  const offset = (currentPage - 1) * limit;

  try {
    const [emails] = await connection.query(
      `SELECT e.*, u.full_name AS recipient_name 
       FROM emails e 
       JOIN users u ON e.recipient_id = u.id 
       WHERE e.sender_id = ? AND e.deleted_by_sender = 0
       ORDER BY e.sent_at DESC 
       LIMIT ? OFFSET ?`,
      [req.user.id, limit, offset]
    );

    const [totalEmails] = await connection.query(
      'SELECT COUNT(*) as count FROM emails WHERE sender_id = ? AND deleted_by_sender = 0',
      [req.user.id]
    );

    const totalPages = Math.ceil(totalEmails[0].count / limit);

    res.render('outbox', {
      user: req.user,
      emails,
      currentPage: currentPage,
      totalPages
    });
  } catch (error) {
    console.error('Outbox error:', error);
    res.status(500).send('An error occurred while fetching emails');
  }
});

// Start server
app.listen(8000, () => {
  console.log('Server running on http://localhost:8000');
 
});
