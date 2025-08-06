const retryDatabaseOperation = async (operation, maxRetries = 3, delay = 1000) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      console.log(`Database operation attempt ${attempt} failed:`, error.message);
      
      // Check if it's a connection-related error
      const isConnectionError = 
        error.code === 'ECONNRESET' ||
        error.code === 'ENOTFOUND' ||
        error.code === 'ETIMEDOUT' ||
        error.message.includes('connection') ||
        error.message.includes('timeout') ||
        error.message.includes('checkpoint');
      
      if (isConnectionError && attempt < maxRetries) {
        console.log(`Retrying in ${delay}ms... (attempt ${attempt}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
        continue;
      }
      
      throw error; // Re-throw if not a connection error or max retries reached
    }
  }
};

module.exports = { retryDatabaseOperation }; 