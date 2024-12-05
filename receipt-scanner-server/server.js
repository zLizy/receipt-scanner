const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();

// Use CORS to allow requests from your React app
app.use(cors());

// Use body-parser to parse JSON bodies
app.use(bodyParser.json());

// Define your API endpoint
app.post('/api/scan-receipt', (req, res) => {
  // Here you would handle the image processing and return receipt data
  // For now, let's just send a mock response
  res.json({
    date: '2023-10-01',
    items: [{ name: 'Milk', price: 2.5 }, { name: 'Bread', price: 1.5 }],
    total: 4.0,
    place: 'Supermarket'
  });
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
