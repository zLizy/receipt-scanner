const express = require('express');
const router = express.Router();
const { updateReceipt } = require('../controllers/receiptController');

router.put('/:id', updateReceipt);

module.exports = router;
