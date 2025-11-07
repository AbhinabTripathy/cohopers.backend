const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoice.controller');
const authAdmin = require('../middlewares/authAdminMiddleware');

// Admin routes

// General invoice routes
// GET /invoices - Get all invoices
router.get('/', invoiceController.getAllInvoices);

// GET /invoices/pending - Get all pending invoices
router.get('/pending', invoiceController.getPendingInvoices);

// GET /invoices/:id - Get a single invoice by ID
router.get('/:id', invoiceController.getInvoiceById);


// POST /invoices/:id/email - Send an invoice by email
router.post('/:id/email', invoiceController.sendInvoiceEmail);

// GET /invoices/:id/pdf - Download an invoice as a PDF
router.get('/:id/pdf', invoiceController.downloadInvoicePDF);

module.exports = router;