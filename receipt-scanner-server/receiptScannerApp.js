require('dotenv').config();

// This code is written in JavaScript and is designed to run in a Node.js environment.
// To run this code, you need to have Node.js installed on your machine.

// Instructions to run the code:
// 1. Save this code in a file named `receiptScannerApp.js`.
// 2. Open a terminal and navigate to the directory where `receiptScannerApp.js` is located.
// 3. Run the command `node receiptScannerApp.js` to execute the code.

// Note: This code is a simulation and uses placeholder functions for image analysis and markdown parsing.
// In a real-world scenario, you would need to replace these placeholders with actual implementations
// that interact with a multimodal large language model and a markdown parser.

const { Client } = require('pg');
const { pipeline } = require('@huggingface/transformers');
const { Image } = require('canvas'); // Assuming you use canvas for image handling
const fs = require('fs');

class ReceiptScannerApp {
    constructor() {
        this.database = new Database();
        this.modelPipeline = null;
    }

    async scanReceipt(imagePath) {
        const receiptData = await this.analyzeImageWithModel(imagePath);
        this.saveToDatabase(receiptData);
    }

    async analyzeImageWithModel(imagePath) {
        const { exec } = require('child_process');
        const pythonScript = 'python3.9 process_image.py'; // Adjust if using a different Python version or path

        return new Promise((resolve, reject) => {
            exec(`${pythonScript} ${imagePath}`, (error, stdout, stderr) => {
                if (error) {
                    console.error(`Error executing Python script: ${error.message}`);
                    return reject(error);
                }

                try {
                    const result = JSON.parse(stdout);
                    // const result = stdout;
                    console.log('type of result:', typeof result);
                    console.log('Python Script Response:\n', result);

                    const jsonData = result;

                    if (!jsonData) {
                        throw new Error('No markdown data received from the Python script');
                    }

                    const parsedData = this.parseJsonData(jsonData);
                    resolve(parsedData);
                } catch (parseError) {
                    console.error('Error parsing JSON:', parseError);
                    reject(parseError);
                }
            });
        });
    }

    parseJsonData(receiptData) {
        // Use the receiptData object directly
        const date = receiptData.date || '';
        const items = receiptData.items || [];
        const total = receiptData.total || 0.0;
        const place = receiptData.place || '';

        console.log(date, items, total, place);
        return {
            date,
            items,
            total,
            place
        };
    }

    saveToDatabase(receiptData) {
        this.database.save(receiptData);
    }

    analyzeExpenses() {
        const allReceipts = this.database.getAllReceipts();
        // Placeholder for analysis logic
        // This could include categorizing expenses, generating reports, etc.
        return allReceipts;
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
            INSERT INTO receipts (date, items, total, place)
            VALUES ($1, $2, $3, $4)
            RETURNING id;
        `;
        const values = [
            receiptData.date, 
            JSON.stringify(receiptData.items), 
            receiptData.total, 
            receiptData.place
        ]; // Ensure items are stored as JSON
        try {
            const res = await this.client.query(query, values);
            console.log('Receipt saved with ID:', res.rows[0].id);
        } catch (err) {
            console.error('Error saving receipt:', err);
        }
    }

    async getAllReceipts() {
        const query = 'SELECT * FROM receipts;';
        try {
            const res = await this.client.query(query);
            return res.rows;
        } catch (err) {
            console.error('Error retrieving receipts:', err);
            return [];
        }
    }
}

// Example usage
const app = new ReceiptScannerApp();
const sampleImage = '../img/ah_2.jpg';
app.scanReceipt(sampleImage).then(() => {
    console.log(app.analyzeExpenses());
});


