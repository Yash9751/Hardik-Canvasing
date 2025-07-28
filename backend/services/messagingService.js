const twilio = require('twilio');

class MessagingService {
  constructor() {
    // Initialize Twilio client with environment variables
    this.client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
    
    this.whatsappFrom = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886'; // Twilio sandbox number
    this.smsFrom = process.env.TWILIO_SMS_FROM || '+18065459043'; // Your Twilio phone number
  }

  // Format phone number for WhatsApp
  formatWhatsAppNumber(phoneNumber) {
    let formatted = phoneNumber.replace(/[^0-9]/g, '');
    
    // Add country code if not present
    if (!formatted.startsWith('91')) {
      formatted = '91' + formatted;
    }
    
    return `whatsapp:+${formatted}`;
  }

  // Format phone number for SMS
  formatSMSNumber(phoneNumber) {
    let formatted = phoneNumber.replace(/[^0-9]/g, '');
    
    // Add country code if not present
    if (!formatted.startsWith('91')) {
      formatted = '91' + formatted;
    }
    
    return `+${formatted}`;
  }

  // Send WhatsApp message using Twilio
  async sendWhatsAppMessage(to, message) {
    try {
      const result = await this.client.messages.create({
        body: message,
        from: this.whatsappFrom,
        to: this.formatWhatsAppNumber(to)
      });

      return {
        success: true,
        messageId: result.sid,
        status: result.status,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`WhatsApp send error for ${to}:`, error.message);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Send SMS as fallback
  async sendSMS(to, message) {
    try {
      const formattedNumber = this.formatSMSNumber(to);
      console.log(`Attempting to send SMS to: ${formattedNumber}`);
      
      const result = await this.client.messages.create({
        body: message,
        from: this.smsFrom,
        to: formattedNumber
      });

      console.log(`SMS result for ${to}:`, {
        sid: result.sid,
        status: result.status,
        errorCode: result.errorCode,
        errorMessage: result.errorMessage
      });

      return {
        success: true,
        messageId: result.sid,
        status: result.status,
        errorCode: result.errorCode,
        errorMessage: result.errorMessage,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`SMS send error for ${to}:`, error.message);
      return {
        success: false,
        error: error.message,
        errorCode: error.code,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Send message with WhatsApp fallback to SMS
  async sendMessage(to, message, preferWhatsApp = true) {
    if (preferWhatsApp) {
      const whatsappResult = await this.sendWhatsAppMessage(to, message);
      if (whatsappResult.success) {
        return { ...whatsappResult, method: 'whatsapp' };
      }
      
      // Fallback to SMS
      const smsResult = await this.sendSMS(to, message);
      return { ...smsResult, method: 'sms' };
    } else {
      const smsResult = await this.sendSMS(to, message);
      return { ...smsResult, method: 'sms' };
    }
  }

  // Send bulk messages
  async sendBulkMessages(recipients, message, preferWhatsApp = true) {
    const results = [];
    
    for (const recipient of recipients) {
      try {
        const result = await this.sendMessage(recipient.phone, message, preferWhatsApp);
        results.push({
          phone: recipient.phone,
          name: recipient.name,
          ...result
        });

        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
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

  // Check message status
  async checkMessageStatus(messageId) {
    try {
      const message = await this.client.messages(messageId).fetch();
      return {
        sid: message.sid,
        status: message.status,
        errorCode: message.errorCode,
        errorMessage: message.errorMessage,
        dateCreated: message.dateCreated,
        dateSent: message.dateSent,
        dateUpdated: message.dateUpdated
      };
    } catch (error) {
      console.error(`Error checking message status for ${messageId}:`, error.message);
      return {
        error: error.message
      };
    }
  }

  // Check if service is configured
  isConfigured() {
    return !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN);
  }

  // Get service status
  getStatus() {
    return {
      configured: this.isConfigured(),
      whatsappFrom: this.whatsappFrom,
      smsFrom: this.smsFrom
    };
  }
}

// Create singleton instance
const messagingService = new MessagingService();

module.exports = messagingService; 