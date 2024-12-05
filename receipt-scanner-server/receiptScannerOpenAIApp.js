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
const { Image } = require('canvas'); // Assuming you use canvas for image handling
const fs = require('fs');
const OpenAI = require('openai'); // Import the OpenAI package
const moment = require('moment');

class ReceiptScannerApp {
    constructor() {
        this.database = new Database();
        this.apiToken = process.env.OPENAI_API_KEY; // Use the correct environment variable name
        if (!this.apiToken) {
            throw new Error('OpenAI API key is not set. Please set the OPENAI_API_KEY environment variable.');
        }
        this.openai = new OpenAI(this.apiToken); // Initialize OpenAI client
    }

    async scanReceipt(imagePath) {
        const image = await this.loadImage(imagePath);
        const receiptData = await this.analyzeImageWithModel(image);
        this.saveToDatabase(receiptData);
    }

    async loadImage(imagePath) {
        const imageBuffer = fs.readFileSync(imagePath);
        const image = new Image();
        image.src = imageBuffer;
        return image;
    }

    async analyzeImageWithModel(image) {
        if (!this.apiToken) {
            throw new Error('OpenAI API token is not set. Please set the OPENAI_API_KEY environment variable.');
        }

        const model_name = "gpt-4o-mini";
        const imageBuffer = image.src; // Assuming image.src contains the image buffer
        const data = {
            model: model_name,
            prompt: `Convert the provided image <|image|> into Markdown format. Ensure that all content from the page is included, such as headers, footers, subtexts, images (with alt text if possible), tables, and any other elements.
            \n\nRequirements:\n\n
            - Output Only Markdown: Return solely the Markdown content without any additional explanations or comments.
            - Identify the language of the receipt and process the information in that language.
            - Identify necessary information such as date, items, total, and place.`,
            inputs: imageBuffer.toString('base64'),
            max_tokens: 1500
        };

        try {
            const response = await this.openai.chat.completions.create({
                model: model_name,
                messages: [
                    { role: "system", content: "You are a helpful assistant." },
                    { role: "user", content: data.prompt }
                ],
                max_tokens: data.max_tokens,
                temperature: 0.7, // Optional: Adjust temperature for creativity
                n: 1 // Optional: Number of completions to generate
            });

            const markdownData = response.choices[0].message.content;
            // print out the response
            console.log(markdownData);

            return this.parseMarkdownData(markdownData);
        } catch (error) {
            console.error('Error calling OpenAI API:', error);
            throw error;
        }
    }

    parseMarkdownData(markdownData) {
        // Parse the markdown data to extract structured information
        const lines = markdownData.split('\n');
        let date = '';
        let items = [];
        let total = 0.0;
        let place = '';

        lines.forEach(line => {
            if (line.startsWith('Date:')) {
                date = line.replace('Date:', '').trim();
            } else if (line.startsWith('Item:')) {
                const itemDetails = line.replace('Item:', '').trim().split(',');
                const name = itemDetails[0].trim();
                const price = parseFloat(itemDetails[1].replace('Price:', '').trim());
                items.push({ name, price });
            } else if (line.startsWith('Total:')) {
                total = parseFloat(line.replace('Total:', '').trim());
            } else if (line.startsWith('Place:')) {
                place = line.replace('Place:', '').trim();
            }
        });

        // Validate and format the date using moment.js
        if (date) {
            const parsedDate = moment(date, ['YYYY-MM-DD', 'MM/DD/YYYY', 'DD-MM-YYYY'], true);
            if (parsedDate.isValid()) {
                date = parsedDate.format('YYYY-MM-DD');
            } else {
                console.warn('Warning: Date is incorrectly formatted. Setting default date.');
                date = '1970-01-01'; // Example default date
            }
        } else {
            console.warn('Warning: Date is missing. Setting default date.');
            date = '1970-01-01'; // Example default date
        }

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
        ];
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


