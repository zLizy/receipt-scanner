require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { MongoClient, ObjectId } = require('mongodb'); // Import MongoDB client and ObjectId
const { exec } = require('child_process');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' }); // Configure multer to save files to 'uploads/' directory
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { login } = require('./auth');

class ReceiptScannerApp {
    constructor() {
        this.database = new Database();
    }

    async analyzeImageWithModel(imagePath, language, country) {
        const pythonScript = 'python3.9 process_image.py'; // Adjust if using a different Python version or path

        return new Promise((resolve, reject) => {
            exec(`${pythonScript} ${imagePath} ${language} ${country}`, (error, stdout, stderr) => {
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
        const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@bonjecluster.gouxx.mongodb.net/?retryWrites=true&w=majority&appName=BonjeCluster`; // MongoDB connection string
        this.client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
        this.client.connect().then(() => {
            this.db = this.client.db('scanner'); // Connect to the 'scanner' database
            this.receipts = this.db.collection('receipts'); // Use the 'receipts' collection
            this.users = this.db.collection('users'); // Use the 'users' collection

            // Ensure the collection exists by attempting to create it
            this.db.createCollection('receipts').catch(err => {
                if (err.codeName !== 'NamespaceExists') {
                    console.error('Error creating receipts collection:', err);
                }
            });

            this.db.createCollection('users').catch(err => {
                if (err.codeName !== 'NamespaceExists') {
                    console.error('Error creating users collection:', err);
                }
            });

            console.log('Connected to MongoDB');
        }).catch(err => console.error('MongoDB connection error:', err));
    }

    async save(receiptData) {
        try {
            const result = await this.receipts.insertOne(receiptData);
            console.log('Receipt saved with ID:', result.insertedId);
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
        const { language, country } = req.body; // Get language and country from the request body

        const receiptData = await receiptScanner.analyzeImageWithModel(imagePath, language, country);
        
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

// Fetch user-specific data
app.get('/api/receipts-data', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    try {
        const data = await receiptScanner.database.receipts.find({ user_id: userId }).toArray();
        res.json(data);
    } catch (error) {
        console.error('Error fetching user data:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update receipt data
app.put('/api/update-receipts/:id', authenticateToken, async (req, res) => {
    const receiptId = req.params.id;
    const { date, category, place, total, items } = req.body;

    // console.log('Update request received for receipt ID:', receiptId);

    // Validate receiptId
    if (!ObjectId.isValid(receiptId)) {
        console.error('Invalid receipt ID:', receiptId);
        return res.status(400).json({ error: 'Invalid receipt ID' });
    }

    try {
        const result = await receiptScanner.database.receipts.updateOne(
            { _id: new ObjectId(receiptId), user_id: req.user.userId },
            { $set: { date, category, place, total, items } }
        );
        if (result.matchedCount === 0) {
            return res.status(404).json({ error: 'Receipt not found or not authorized' });
        }
        res.json({ message: 'Receipt updated successfully' });
    } catch (error) {
        console.error('Error updating receipt:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.delete('/api/delete-receipts/:id', authenticateToken, async (req, res) => {
    const receiptId = req.params.id;
    const userId = req.user.userId;

    try {
        const result = await receiptScanner.database.receipts.deleteOne({ _id: new ObjectId(receiptId), user_id: userId });

        if (result.deletedCount === 0) {
            return res.status(404).json({ error: 'Receipt not found or not authorized' });
        }

        console.log('Receipt deleted successfully:', receiptId);
        res.status(204).send(); // No content response
    } catch (error) {
        console.error('Error deleting receipt:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Register a new user
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    // Store user in the MongoDB database
    const result = await receiptScanner.database.users.insertOne({ username, password: hashedPassword });
    res.status(201).json({ message: 'User registered', userId: result.insertedId }); // Send JSON response
  } catch (error) {
    console.error('Error during registration:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login a user
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await receiptScanner.database.users.findOne({ username });
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Upload a new receipt
app.post('/api/upload-receipt', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
//   const userId = req.user.username;
  const { image } = req.body; // Assuming image is sent in the request body
  // Process and store the image
  // await pool.query('INSERT INTO receipts (user_id, image_data) VALUES ($1, $2)', [userId, image]);
  res.status(201).send('Receipt uploaded');
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
        console.log('Token verified.');
        req.user = user;
        next();
    });
}

// Fetch user profile data
app.get('/api/user-profile', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    try {
        const user = await receiptScanner.database.users.findOne({ _id: new ObjectId(userId) }, { projection: { username: 1, email: 1 } });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(user);
    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

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
