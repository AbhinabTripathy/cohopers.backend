const { ZohoBooksService } = require('../config/zoho.config');
const zohoService = new ZohoBooksService();

// Get all invoices
exports.getAllInvoices = async (req, res) => {
  try {
    const invoices = await zohoService.getInvoices(req.query);
    res.success(invoices, 'Invoices retrieved successfully');
  } catch (error) {
    res.error(error, 'Failed to retrieve invoices');
  }
};

// Get pending invoices
exports.getPendingInvoices = async (req, res) => {
  try {
    const invoices = await zohoService.getInvoices({ status: 'sent' }); // Fetch unpaid invoices
    const pendingInvoices = invoices.invoices.map(invoice => ({
      customer_name: invoice.customer_name,
      invoice_number: invoice.invoice_number,
      date: invoice.date,
      due_date: invoice.due_date,
      total: invoice.total,
      balance: invoice.balance,
    }));
    res.success(pendingInvoices, 'Pending invoices retrieved successfully');
  } catch (error) {
    res.error(error, 'Failed to retrieve pending invoices');
  }
};

// Get invoice by ID
exports.getInvoiceById = async (req, res) => {
  try {
    const invoice = await zohoService.getInvoiceById(req.params.id);
    res.success(invoice, 'Invoice retrieved successfully');
  } catch (error) {
    res.error(error, 'Failed to retrieve invoice');
  }
};

// Send invoice by email
exports.sendInvoiceEmail = async (req, res) => {
  try {
    const { id } = req.params;
    const emailData = req.body; // Expects { to_mail_ids: [...], subject: ..., body: ... }
    const result = await zohoService.sendInvoiceEmail(id, emailData);
    res.success(result, 'Invoice sent successfully');
  } catch (error) {
    res.error(error, 'Failed to send invoice');
  }
};

// Download invoice PDF
exports.downloadInvoicePDF = async (req, res) => {
  try {
    const { id } = req.params;
    const pdfBuffer = await zohoService.getInvoicePDF(id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${id}.pdf`);
    res.send(pdfBuffer);
  } catch (error) {
    res.error(error, 'Failed to download invoice PDF');
  }
};