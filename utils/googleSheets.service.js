const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

// Initialize Google Sheets service
class GoogleSheetsService {
  constructor() {
    this.sheets = null;
    this.spreadsheetId = process.env.GOOGLE_SHEET_ID;
    this.initialized = false;
  }

  /**
   * Initialize Google Sheets API with service account credentials
   * Reads credentials from the path specified in environment variables
   */
  async initialize() {
    try {
      // Check if required environment variables are set
      if (!process.env.GOOGLE_SHEET_ID || !process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH) {
        console.warn('⚠️  Google Sheets integration disabled: Missing GOOGLE_SHEET_ID or GOOGLE_SERVICE_ACCOUNT_KEY_PATH');
        this.initialized = false;
        return;
      }

      // Read the service account key file
      const keyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH;
      
      if (!fs.existsSync(keyPath)) {
        console.warn(`⚠️  Google service account key file not found at: ${keyPath}`);
        this.initialized = false;
        return;
      }

      const keyFile = require(path.resolve(keyPath));

      // Create OAuth2 client for service account
      const auth = new google.auth.GoogleAuth({
        credentials: keyFile,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });

      // Initialize Sheets API
      this.sheets = google.sheets({ version: 'v4', auth });
      this.spreadsheetId = process.env.GOOGLE_SHEET_ID;
      this.initialized = true;
      
      console.log('✓ Google Sheets API initialized successfully');
    } catch (error) {
      console.error('✗ Failed to initialize Google Sheets API:', error.message);
      this.initialized = false;
    }
  }

  /**
   * Append a coffee order row to the Google Spreadsheet
   * Maps coffee order data to spreadsheet columns
   * 
   * @param {Object} order - The CafeteriaOrder database object
   * @param {Object} user - The User database object
   * @param {Object} space - The Space database object (optional)
   * @param {Object} kyc - The KYC database object (optional)
   * @returns {Promise<boolean>} - true if successful, false otherwise
   */
  async appendCoffeeOrderRow(order, user, space = null, kyc = null) {
    // If Google Sheets is not initialized, skip silently
    if (!this.initialized || !this.sheets) {
      return false;
    }

    try {
      // Map order data to spreadsheet columns in exact order:
      // 1. Order ID
      // 2. Username
      // 3. Cabin Number
      // 4. Room Number
      // 5. Company Name
      // 6. Personal
      // 7. Item Name
      // 8. Quantity
      // 9. Order Type
      // 10. Special Instructions
      // 11. Payment Method
      // 12. Payment Status
      // 13. Amount
      // 14. Order Date
      // 15. Status

      const values = [
        [
          order.id || '',                                    // Order ID
          user?.username || '',                              // Username
          space?.cabinNumber || user?.cabinNumber || '',     // Cabin Number
          space?.roomNumber || user?.roomNumber || '',       // Room Number
          kyc?.companyName || kyc?.name || '',               // Company Name
          order.isPersonal ? 'Yes' : 'No',                   // Personal
          order.itemName || '',                              // Item Name
          order.quantity || '',                              // Quantity
          order.orderType || '',                             // Order Type
          order.specialInstructions || '',                   // Special Instructions
          order.isMonthlyPayment ? 'Monthly' : 'One-Time',   // Payment Method
          order.paid || '',                                  // Payment Status
          order.totalAmount || '',                           // Amount
          order.createdAt?.toISOString?.() || new Date().toISOString(), // Order Date
          order.status || '',                                // Status
        ]
      ];

      // Append the row to the spreadsheet
      const response = await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: 'Sheet1!A:O', // Columns A to O (15 columns)
        valueInputOption: 'RAW',
        resource: {
          values: values,
        },
      });

      console.log(`✓ Coffee order ${order.id} appended to Google Sheet`);
      return true;
    } catch (error) {
      console.error(`✗ Failed to append coffee order ${order?.id} to Google Sheets:`, error.message);
      return false;
    }
  }

  /**
   * Check if Google Sheets service is properly initialized
   * @returns {boolean}
   */
  isInitialized() {
    return this.initialized && this.sheets !== null;
  }
}

// Create and export singleton instance
const googleSheetsService = new GoogleSheetsService();

// Initialize on module load
googleSheetsService.initialize();

module.exports = googleSheetsService;
