const axios = require('axios');

const ZOHO_CONFIG = {
  BASE_URL: 'https://www.zohoapis.com/books/v3',
  ORGANIZATION_ID: process.env.ZOHO_ORGANIZATION_ID || 'your-organization-id-here',
  ACCESS_TOKEN: process.env.ZOHO_ACCESS_TOKEN || 'your-access-token-here',
  CLIENT_ID: process.env.ZOHO_CLIENT_ID || 'your-client-id-here',
  CLIENT_SECRET: process.env.ZOHO_CLIENT_SECRET || 'your-client-secret-here',
  REFRESH_TOKEN: process.env.ZOHO_REFRESH_TOKEN || 'your-refresh-token-here'
};

class ZohoBooksService {
  constructor() {
    this.baseURL = ZOHO_CONFIG.BASE_URL;
    this.organizationId = ZOHO_CONFIG.ORGANIZATION_ID;
    this.accessToken = ZOHO_CONFIG.ACCESS_TOKEN;
  }

  // Set authorization header
  getAuthHeaders() {
    return {
      'Authorization': `Zoho-oauthtoken ${this.accessToken}`,
      'Content-Type': 'application/json'
    };
  }

  // Refresh access token using refresh token
  async refreshAccessToken() {
    try {
      const response = await axios.post('https://accounts.zoho.com/oauth/v2/token', null, {
        params: {
          refresh_token: ZOHO_CONFIG.REFRESH_TOKEN,
          client_id: ZOHO_CONFIG.CLIENT_ID,
          client_secret: ZOHO_CONFIG.CLIENT_SECRET,
          grant_type: 'refresh_token'
        }
      });

      this.accessToken = response.data.access_token;
      ZOHO_CONFIG.ACCESS_TOKEN = response.data.access_token;
      
      return response.data.access_token;
    } catch (error) {
      console.error('Error refreshing Zoho access token:', error.response?.data || error.message);
      throw error;
    }
  }

  // Create a new invoice
  async createInvoice(invoiceData) {
    try {
      const response = await axios.post(
        `${this.baseURL}/invoices`,
        invoiceData,
        {
          headers: this.getAuthHeaders(),
          params: { organization_id: this.organizationId }
        }
      );
      return response.data;
    } catch (error) {
      // If token expired, try to refresh and retry
      if (error.response?.status === 401) {
        await this.refreshAccessToken();
        return this.createInvoice(invoiceData);
      }
      throw error;
    }
  }

  // Get all invoices
  async getInvoices(params = {}) {
    try {
      const response = await axios.get(
        `${this.baseURL}/invoices`,
        {
          headers: this.getAuthHeaders(),
          params: { organization_id: this.organizationId, ...params }
        }
      );
      return response.data;
    } catch (error) {
      if (error.response?.status === 401) {
        await this.refreshAccessToken();
        return this.getInvoices(params);
      }
      throw error;
    }
  }

  // Get invoice by ID
  async getInvoiceById(invoiceId) {
    try {
      const response = await axios.get(
        `${this.baseURL}/invoices/${invoiceId}`,
        {
          headers: this.getAuthHeaders(),
          params: { organization_id: this.organizationId }
        }
      );
      return response.data;
    } catch (error) {
      if (error.response?.status === 401) {
        await this.refreshAccessToken();
        return this.getInvoiceById(invoiceId);
      }
      throw error;
    }
  }

  // Update invoice
  async updateInvoice(invoiceId, updateData) {
    try {
      const response = await axios.put(
        `${this.baseURL}/invoices/${invoiceId}`,
        updateData,
        {
          headers: this.getAuthHeaders(),
          params: { organization_id: this.organizationId }
        }
      );
      return response.data;
    } catch (error) {
      if (error.response?.status === 401) {
        await this.refreshAccessToken();
        return this.updateInvoice(invoiceId, updateData);
      }
      throw error;
    }
  }

  // Delete invoice
  async deleteInvoice(invoiceId) {
    try {
      const response = await axios.delete(
        `${this.baseURL}/invoices/${invoiceId}`,
        {
          headers: this.getAuthHeaders(),
          params: { organization_id: this.organizationId }
        }
      );
      return response.data;
    } catch (error) {
      if (error.response?.status === 401) {
        await this.refreshAccessToken();
        return this.deleteInvoice(invoiceId);
      }
      throw error;
    }
  }

  // Send invoice by email
  async sendInvoiceEmail(invoiceId, emailData) {
    try {
      const response = await axios.post(
        `${this.baseURL}/invoices/${invoiceId}/email`,
        emailData,
        {
          headers: this.getAuthHeaders(),
          params: { organization_id: this.organizationId }
        }
      );
      return response.data;
    } catch (error) {
      if (error.response?.status === 401) {
        await this.refreshAccessToken();
        return this.sendInvoiceEmail(invoiceId, emailData);
      }
      throw error;
    }
  }

  // Get invoice PDF
  async getInvoicePDF(invoiceId) {
    try {
      const response = await axios.get(
        `${this.baseURL}/invoices/${invoiceId}/pdf`,
        {
          headers: this.getAuthHeaders(),
          params: { organization_id: this.organizationId },
          responseType: 'arraybuffer'
        }
      );
      return response.data;
    } catch (error) {
      if (error.response?.status === 401) {
        await this.refreshAccessToken();
        return this.getInvoicePDF(invoiceId);
      }
      throw error;
    }
  }
}

module.exports = { ZohoBooksService, ZOHO_CONFIG };