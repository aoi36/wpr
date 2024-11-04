const mysql = require('mysql2/promise');

async function setupDatabase() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: '127.0.0.1',
      port: 3306,
      user: 'wpr',
      password: 'fit123'
    });

    // Create database
    await connection.query('CREATE DATABASE IF NOT EXISTS wpr2201040165');
    await connection.query('USE wpr2201040165');

    // Create users table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        full_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL
      )
    `);

    // Create emails table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS emails (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sender_id INT NOT NULL,
    recipient_id INT NOT NULL,
    subject VARCHAR(255),
    body TEXT,
    attachment VARCHAR(255),
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_sender FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_recipient FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Insert users
    await connection.query(`
      INSERT INTO users (full_name, email, password) VALUES
      ('User One', 'a@a.com', '123'),
      ('User Two', 'b@b.com', 'password123'),
      ('User Three', 'c@c.com', 'securepass')
    `);

    // Insert emails
    await connection.query(`
      INSERT INTO emails (sender_id, recipient_id, subject, body) VALUES
      (1, 2, 'Hello from User One', 'This is a test email from User One to User Two.'),
      (1, 3, 'Greetings', 'Hello User Three, how are you?'),
      (2, 1, 'Reply to User One', 'Thanks for your email, User One!'),
      (2, 3, 'Meeting tomorrow', 'Do not forget about our meeting tomorrow at 10 AM.')`);

    console.log('Database setup completed successfully.');
  } catch (error) {
    console.error('Error setting up database:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

setupDatabase();