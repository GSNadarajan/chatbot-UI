// chatbotInstance.js
const { ChatbotService } = require('./chatbotService');
const intentsData = require('../data/intent.json');

// Create and export a singleton instance with default configuration
const chatbotService = new ChatbotService({ intentsData });
module.exports = chatbotService;