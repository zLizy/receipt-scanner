require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { Client } = require('pg');
const { exec } = require('child_process');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' }); // Configure multer to save files to 'uploads/' directory
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg'); // Assuming PostgreSQL
const { login } = require('./auth');

class ReceiptScannerApp {
    constructor() {
        this.database = new Database();
    }

    async analyzeImageWithModel(imagePath) {
        const pythonScript = 'python3.9 process_image.py'; // Adjust if using a different Python version or path

        return new Promise((resolve, reject) => {
            exec(`${pythonScript} ${imagePath}`, (error, stdout, stderr) => {
                if (error) {
                    console.error(`Error executing Python script: ${error.message}`);
                    return reject(error);
                }

                try {
                    const result = JSON.parse(stdout);
                    console.log('Python Script Response:\n', result);

                    const parsedData = this.parseJsonData(result);
                    resolve(parsedData);
                } catch (parseError) {
                    console.error('Error parsing JSON:', parseError);
                    reject(parseError);
                }
            });
        });
    }

    parseJsonData(receiptData) {
        const user_id = receiptData.user_id || null;
        const date = receiptData.date || '';
        const items = receiptData.items || [];
        const total = receiptData.total || 0.0;
        const place = receiptData.place || '';
        const category = receiptData.category || '';
        const image_data = receiptData.image_data || null;

        return { user_id, date, items, total, place, category, image_data };
    }

    saveToDatabase(receiptData) {
        this.database.save(receiptData);
    }
}

class Database {
    constructor() {
        this.client = new Client({
            user: 'lizy',
            host: 'localhost',
            database: 'scanner',
            password: '1234',
            port: 5432,
        });
        this.client.connect();
    }

    async save(receiptData) {
        const query = `
            INSERT INTO receipts (user_id, date, items, total, place, category, image_data)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id;
        `;
        const values = [
            receiptData.user_id, 
            receiptData.date, 
            JSON.stringify(receiptData.items), 
            receiptData.total, 
            receiptData.place,
            receiptData.category,
            receiptData.image_data
        ];
        try {
            const res = await this.client.query(query, values);
            console.log('Receipt saved with ID:', res.rows[0].id);
        } catch (err) {
            console.error('Error saving receipt:', err);
        }
    }
}

// Express server setup
const app = express();
app.use(cors());
app.use(bodyParser.json());

const receiptScanner = new ReceiptScannerApp();

app.post('/api/scan-receipt', upload.single('image'), authenticateToken, async (req, res) => {
    try {
        const imagePath = req.file.path; // Get the path of the uploaded file
        const receiptData = await receiptScanner.analyzeImageWithModel(imagePath);
        
        console.log('User ID:', req.user.userId);
        receiptData.user_id = req.user.userId;
        receiptData.image_data = req.file.buffer;

        receiptScanner.saveToDatabase(receiptData);

        // Follow-up action: Log the successful processing
        console.log(`Receipt processed for user ID: ${receiptData.user_id}`);

        res.json(receiptData);
    } catch (error) {
        console.error('Error processing receipt:', error);
        res.status(500).send('Error processing receipt');
    }
});

const pool = new Pool({
    user: 'lizy',
    host: 'localhost',
    database: 'scanner',
    password: '1234',
    port: 5432,
});

// Function to create tables if they don't exist
async function createTables() {
  const createUsersTableQuery = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL
    );
  `;

  const createReceiptsTableQuery = `
    CREATE TABLE IF NOT EXISTS receipts (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      date DATE,
      items JSONB,
      total NUMERIC,
      place VARCHAR(255),
      category VARCHAR(255),
      image_data BYTEA
    );
  `;

  try {
    await pool.query(createUsersTableQuery);
    await pool.query(createReceiptsTableQuery);
    console.log('Tables created or verified successfully.');
  } catch (error) {
    console.error('Error creating tables:', error);
  }
}

// Call the function to create tables when the server starts
createTables();

// Register a new user
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    // Store user in the database
    await pool.query('INSERT INTO users (username, password) VALUES ($1, $2)', [username, hashedPassword]);
    res.status(201).json({ message: 'User registered' }); // Send JSON response
  } catch (error) {
    console.error('Error during registration:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login a user
app.post('/api/login', login);

// Fetch user-specific data
app.get('/api/user-data', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const data = await pool.query('SELECT * FROM receipts WHERE user_id = $1', [userId]);
//   console.log('User data:', data.rows);
  res.json(data.rows);
});

// Upload a new receipt
app.post('/api/upload-receipt', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
//   const userId = req.user.username;
  const { image } = req.body; // Assuming image is sent in the request body
  // Process and store the image
  await pool.query('INSERT INTO receipts (user_id, image_data) VALUES ($1, $2)', [userId, image]);
  res.status(201).send('Receipt uploaded');
});

// Update receipt data
app.put('/api/update-receipts/:id', authenticateToken, async (req, res) => {
    const receiptId = req.params.id;
    const { date, category, place, total, items } = req.body;

    console.log('Update request received for receipt ID:', receiptId);
    // console.log('Request body:', req.body);

    const query = `
        UPDATE receipts
        SET date = $1, category = $2, place = $3, total = $4, items = $5
        WHERE id = $6 AND user_id = $7
        RETURNING *;
    `;
    const values = [
        date,
        category,
        place,
        total,
        JSON.stringify(items),
        receiptId,
        req.user.userId
    ];

    try {
        const result = await pool.query(query, values);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Receipt not found or not authorized' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating receipt:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.delete('/api/delete-receipts/:id', authenticateToken, async (req, res) => {
  const receiptId = req.params.id;
  const userId = req.user.userId;

  try {
    const result = await pool.query('DELETE FROM receipts WHERE id = $1 AND user_id = $2 RETURNING id', [receiptId, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Receipt not found or not authorized' });
    }

    console.log('Receipt deleted successfully:', result.rows[0].id);
    res.status(204).send(); // No content response
  } catch (error) {
    console.error('Error deleting receipt:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    // console.log('Auth Header:', authHeader);

    if (!authHeader) {
        console.log('Authorization header is missing');
        return res.status(401).json({ error: 'Authorization header is missing' });
    }

    // if (!token) {
    //     console.log('Token is missing from the Authorization header');
    //     return res.status(401).json({ error: 'Token is missing' });
    // }

    const jwtSecret = process.env.JWT_SECRET;

    jwt.verify(token, jwtSecret, (err, user) => {
        if (err) {
            console.log('Token verification failed:', err);
            return res.status(403).json({ error: 'Token verification failed' });
        }
        console.log('Token verified, user:', user);
        req.user = user;
        next();
    });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// Ensure all routes are defined before this middleware
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
