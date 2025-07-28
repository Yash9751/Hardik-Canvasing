class DirectMessagingService {
  constructor() {
    this.defaultCountryCode = '91'; // India
  }

  // Format phone number
  formatPhoneNumber(phoneNumber) {
    let formatted = phoneNumber.replace(/[^0-9]/g, '');
    
    // Add country code if not present
    if (!formatted.startsWith('91')) {
      formatted = '91' + formatted;
    }
    
    return formatted;
  }

  // Generate WhatsApp direct link
  generateWhatsAppLink(phoneNumber, message) {
    const formattedNumber = this.formatPhoneNumber(phoneNumber);
    const encodedMessage = encodeURIComponent(message);
    return `https://wa.me/${formattedNumber}?text=${encodedMessage}`;
  }

  // Generate SMS link
  generateSMSLink(phoneNumber, message) {
    const formattedNumber = this.formatPhoneNumber(phoneNumber);
    const encodedMessage = encodeURIComponent(message);
    return `sms:${formattedNumber}?body=${encodedMessage}`;
  }

  // Generate bulk messaging instructions
  generateBulkInstructions(recipients, message) {
    const instructions = {
      whatsappLinks: [],
      smsLinks: [],
      phoneNumbers: [],
      message: message,
      totalRecipients: recipients.length
    };

    recipients.forEach(recipient => {
      const phone = this.formatPhoneNumber(recipient.phone);
      
      instructions.whatsappLinks.push({
        name: recipient.name,
        phone: phone,
        link: this.generateWhatsAppLink(recipient.phone, message)
      });

      instructions.smsLinks.push({
        name: recipient.name,
        phone: phone,
        link: this.generateSMSLink(recipient.phone, message)
      });

      instructions.phoneNumbers.push({
        name: recipient.name,
        phone: phone
      });
    });

    return instructions;
  }

  // Generate CSV for bulk import
  generateCSV(recipients, message) {
    const csvHeader = 'Name,Phone Number,WhatsApp Link,SMS Link\n';
    const csvRows = recipients.map(recipient => {
      const phone = this.formatPhoneNumber(recipient.phone);
      const whatsappLink = this.generateWhatsAppLink(recipient.phone, message);
      const smsLink = this.generateSMSLink(recipient.phone, message);
      
      return `"${recipient.name}","${phone}","${whatsappLink}","${smsLink}"`;
    }).join('\n');

    return csvHeader + csvRows;
  }

  // Generate message preview
  generateMessagePreview(message, recipients) {
    return {
      message: message,
      recipients: recipients.map(r => ({
        name: r.name,
        phone: this.formatPhoneNumber(r.phone)
      })),
      totalRecipients: recipients.length,
      estimatedCost: this.estimateCost(recipients.length)
    };
  }

  // Estimate cost (for reference)
  estimateCost(recipientCount) {
    // Rough estimates - adjust based on your needs
    return {
      whatsapp: 0, // WhatsApp is free
      sms: recipientCount * 0.5, // Approximate SMS cost in INR
      total: recipientCount * 0.5
    };
  }

  // Get service status
  getStatus() {
    return {
      service: 'direct-messaging',
      configured: true,
      features: ['whatsapp-links', 'sms-links', 'bulk-instructions', 'csv-export'],
      countryCode: this.defaultCountryCode
    };
  }
}

// Create singleton instance
const directMessagingService = new DirectMessagingService();

module.exports = directMessagingService; 