const puppeteer = require('puppeteer');

class WhatsAppService {
  constructor() {
    this.browser = null;
    this.page = null;
    this.isLoggedIn = false;
  }

  async initialize() {
    try {
      this.browser = await puppeteer.launch({
        headless: false, // Set to true in production
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ]
      });

      this.page = await this.browser.newPage();
      
      // Set user agent to avoid detection
      await this.page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      
      // Navigate to WhatsApp Web
      await this.page.goto('https://web.whatsapp.com/', {
        waitUntil: 'networkidle2',
        timeout: 60000
      });

      console.log('WhatsApp Web loaded successfully');
      return true;
    } catch (error) {
      console.error('Error initializing WhatsApp service:', error);
      return false;
    }
  }

  async waitForLogin() {
    try {
      // Wait for QR code to be scanned and user to be logged in
      await this.page.waitForSelector('div[data-testid="chat-list"]', {
        timeout: 120000 // 2 minutes timeout
      });
      
      this.isLoggedIn = true;
      console.log('WhatsApp Web logged in successfully');
      return true;
    } catch (error) {
      console.error('Error waiting for login:', error);
      return false;
    }
  }

  async sendMessage(phoneNumber, message) {
    if (!this.isLoggedIn) {
      throw new Error('WhatsApp not logged in');
    }

    try {
      // Format phone number (remove + and add country code if needed)
      let formattedNumber = phoneNumber.replace(/[^0-9]/g, '');
      if (!formattedNumber.startsWith('91')) {
        formattedNumber = '91' + formattedNumber;
      }

      // Navigate to the chat URL
      const chatUrl = `https://web.whatsapp.com/send?phone=${formattedNumber}&text=${encodeURIComponent(message)}`;
      await this.page.goto(chatUrl, { waitUntil: 'networkidle2' });

      // Wait for the chat to load
      await this.page.waitForSelector('div[data-testid="conversation-compose-box-input"]', {
        timeout: 30000
      });

      // Wait a bit for the page to fully load
      await this.page.waitForTimeout(2000);

      // Click the send button
      await this.page.click('span[data-testid="send"]');

      // Wait for message to be sent
      await this.page.waitForTimeout(3000);

      console.log(`Message sent successfully to ${phoneNumber}`);
      return true;
    } catch (error) {
      console.error(`Error sending message to ${phoneNumber}:`, error);
      return false;
    }
  }

  async sendBulkMessages(recipients, message) {
    if (!this.isLoggedIn) {
      throw new Error('WhatsApp not logged in');
    }

    const results = [];
    
    for (const recipient of recipients) {
      try {
        const success = await this.sendMessage(recipient.phone, message);
        results.push({
          phone: recipient.phone,
          name: recipient.name,
          success,
          timestamp: new Date().toISOString()
        });

        // Add delay between messages to avoid rate limiting
        await this.page.waitForTimeout(2000);
      } catch (error) {
        results.push({
          phone: recipient.phone,
          name: recipient.name,
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }

    return results;
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
      this.isLoggedIn = false;
    }
  }

  async isReady() {
    return this.isLoggedIn && this.page !== null;
  }
}

// Create a singleton instance
const whatsappService = new WhatsAppService();

module.exports = whatsappService; 