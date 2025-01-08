// chatbotService.js

// Custom error types for specific failure scenarios
class ChatbotError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ChatbotError';
    }
}

class IntentLoadError extends ChatbotError {
    constructor(message) {
        super(message);
        this.name = 'IntentLoadError';
    }
}

class IntentMatchError extends ChatbotError {
    constructor(message) {
        super(message);
        this.name = 'IntentMatchError';
    }
}

class ResponseGenerationError extends ChatbotError {
    constructor(message) {
        super(message);
        this.name = 'ResponseGenerationError';
    }
}

/**
 * Service class for handling chatbot operations including intent matching and response generation
 */
class ChatbotService {
    /**
     * Creates a new ChatbotService instance
     * @param {Object} options - Configuration options
     * @param {Object} options.intentsData - The intent data to use
     * @param {Function} options.logger - Logger function for errors (optional)
     */
    constructor(options = {}) {
        this.intents = [];
        this.logger = options.logger || console.error;
        this.metrics = options.metrics;
        
        if (options.intentsData) {
            this.loadIntents(options.intentsData);
        }
    }

    /**
     * Loads and initializes the intent data
     * @param {Object} intentsData - The intent data to load
     * @throws {IntentLoadError} If the intent data is invalid
     */
    loadIntents(intentsData) {
        try {
            if (!intentsData) {
                throw new IntentLoadError('Intent data is missing');
            }
            if (!intentsData.intents) {
                throw new IntentLoadError('Invalid intent data structure: missing intents property');
            }
            if (!Array.isArray(intentsData.intents)) {
                throw new IntentLoadError('Invalid intent data structure: intents must be an array');
            }
            if (intentsData.intents.length === 0) {
                throw new IntentLoadError('Intent data is empty');
            }

            // Validate intent structure
            for (const intent of intentsData.intents) {
                if (!intent.tag || !intent.patterns || !intent.responses) {
                    throw new IntentLoadError('Invalid intent structure: missing required properties');
                }
                if (!Array.isArray(intent.patterns) || !Array.isArray(intent.responses)) {
                    throw new IntentLoadError('Invalid intent structure: patterns and responses must be arrays');
                }
            }

            this.intents = intentsData.intents;
        } catch (error) {
            this.logger('Error loading intents:', error);
            const wrappedError = error instanceof ChatbotError ? error : new IntentLoadError('Failed to load intent data: ' + error.message);
            
            if (this.metrics) {
                this.metrics.recordError('INTENT_LOAD_ERROR', wrappedError.message);
            }
            
            throw wrappedError;
        }
    }

    /**
     * Calculates Levenshtein distance between two strings
     * @private
     * @param {string} str1 - First string
     * @param {string} str2 - Second string
     * @returns {number} The Levenshtein distance
     */
    _calculateLevenshteinDistance(str1, str2) {
        const matrix = Array(str2.length + 1).fill(null)
            .map(() => Array(str1.length + 1).fill(null));

        for (let i = 0; i <= str1.length; i++) {
            matrix[0][i] = i;
        }
        for (let j = 0; j <= str2.length; j++) {
            matrix[j][0] = j;
        }

        for (let j = 1; j <= str2.length; j++) {
            for (let i = 1; i <= str1.length; i++) {
                const substitutionCost = str1[i - 1] === str2[j - 1] ? 0 : 1;
                matrix[j][i] = Math.min(
                    matrix[j][i - 1] + 1, // deletion
                    matrix[j - 1][i] + 1, // insertion
                    matrix[j - 1][i - 1] + substitutionCost // substitution
                );
            }
        }

        return matrix[str2.length][str1.length];
    }

    /**
     * Calculates similarity score between two strings
     * @private
     * @param {string} str1 - First string
     * @param {string} str2 - Second string
     * @returns {number} Similarity score between 0 and 1
     */
    _calculateStringSimilarity(str1, str2) {
        if (!str1 || !str2) return 0;
        const maxLength = Math.max(str1.length, str2.length);
        if (maxLength === 0) return 1;
        const distance = this._calculateLevenshteinDistance(str1, str2);
        return 1 - (distance / maxLength);
    }

    /**
     * Calculates word order similarity between two phrases
     * @private
     * @param {string[]} queryWords - Words from the query
     * @param {string[]} patternWords - Words from the pattern
     * @returns {number} Word order similarity score between 0 and 1
     */
    _calculateWordOrderSimilarity(queryWords, patternWords) {
        if (queryWords.length === 0 || patternWords.length === 0) return 0;
        
        let matchCount = 0;
        let orderScore = 0;
        let keywordMatches = 0;
        
        // Define medical keywords that should have higher weight
        const medicalKeywords = ['cuts', 'fever', 'headache', 'pain', 'treatment', 'cure'];
        
        for (let i = 0; i < queryWords.length; i++) {
            const queryWord = queryWords[i];
            let bestMatchScore = 0;
            let bestMatchIndex = -1;
            
            // Find the best matching word in the pattern
            for (let j = 0; j < patternWords.length; j++) {
                const similarity = this._calculateStringSimilarity(queryWord, patternWords[j]);
                if (similarity > bestMatchScore) {
                    bestMatchScore = similarity;
                    bestMatchIndex = j;
                }
            }
            
            if (bestMatchScore > 0.6) {
                matchCount++;
                // Calculate order similarity based on relative positions
                const positionDiff = Math.abs(i - bestMatchIndex);
                orderScore += 1 - (positionDiff / Math.max(queryWords.length, patternWords.length));
                
                // Give extra weight to medical keyword matches
                if (medicalKeywords.some(keyword => 
                    queryWord.toLowerCase().includes(keyword) || 
                    patternWords[bestMatchIndex].toLowerCase().includes(keyword))) {
                    keywordMatches++;
                }
            }
        }
        
        // Calculate final score with extra weight for medical keywords
        const baseScore = matchCount > 0 ? orderScore / matchCount : 0;
        const keywordBonus = keywordMatches * 0.2; // Add 0.2 per medical keyword match
        
        return Math.min(1, baseScore + keywordBonus); // Cap at 1.0
    }

    /**
     * Matches user query with available intents using an improved pattern matching algorithm
     * @param {string} query - User input query
     * @returns {Object|null} Matched intent or null if no match found
     */
    findMatchingIntent(query) {
        try {
            if (!query) {
                return null;
            }

            if (typeof query !== 'string') {
                throw new IntentMatchError('Query must be a string');
            }

            if (!this.intents || !Array.isArray(this.intents) || this.intents.length === 0) {
                throw new IntentMatchError('No intents available for matching');
            }

            const normalizedQuery = query.toLowerCase().trim();
            if (normalizedQuery.length === 0) {
                return null;
            }

            const queryWords = normalizedQuery.split(' ').filter(word => word.length > 0);
            let bestMatch = {
                intent: null,
                score: 0
            };

            // Compare against all intents to find the best match
            for (const intent of this.intents) {
                if (!intent.patterns || !Array.isArray(intent.patterns)) {
                    console.warn(`Skipping invalid intent: ${intent.tag}`);
                    continue;
                }

                let intentScore = 0;
                for (const pattern of intent.patterns) {
                    if (typeof pattern !== 'string') {
                        console.warn(`Skipping invalid pattern in intent: ${intent.tag}`);
                        continue;
                    }

                    const normalizedPattern = pattern.toLowerCase();
                    const patternWords = normalizedPattern.split(' ').filter(word => word.length > 0);
                    
                    // Calculate various similarity scores
                    const exactMatchScore = normalizedQuery === normalizedPattern ? 1 : 0;
                    const wordOrderScore = this._calculateWordOrderSimilarity(queryWords, patternWords);
                    
                    // Calculate word-level similarity
                    let wordSimilarityScore = 0;
                    let matchedWords = 0;
                    
                    for (const queryWord of queryWords) {
                        let bestWordScore = 0;
                        for (const patternWord of patternWords) {
                            const similarity = this._calculateStringSimilarity(queryWord, patternWord);
                            bestWordScore = Math.max(bestWordScore, similarity);
                        }
                        if (bestWordScore > 0.6) {
                            matchedWords++;
                        }
                        wordSimilarityScore += bestWordScore;
                    }
                    
                    wordSimilarityScore = wordSimilarityScore / queryWords.length;
                    
                    // Calculate pattern score with weighted components
                    const patternScore = (
                        exactMatchScore * 1.0 +  // Exact match has highest weight
                        wordSimilarityScore * 0.7 +  // Word similarity is more important
                        wordOrderScore * 0.6 +  // Word order matters more now
                        (matchedWords / Math.max(queryWords.length, patternWords.length)) * 0.9  // Higher weight for matched words
                    ) / 3.2;  // Normalize by sum of weights
                    
                    console.log(`Pattern: "${pattern}", Score: ${patternScore}, Components:`, {
                        exactMatchScore,
                        wordSimilarityScore,
                        wordOrderScore,
                        matchedWordsProportion: matchedWords / Math.max(queryWords.length, patternWords.length)
                    });
                    intentScore = Math.max(intentScore, patternScore);
                }

                if (intentScore > bestMatch.score) {
                    bestMatch = {
                        intent: intent,
                        score: intentScore
                    };
                }
            }
            
            // Return the best matching intent if it meets the threshold
            console.log('Best match:', {
                intent: bestMatch.intent?.tag,
                score: bestMatch.score
            });
            console.log('Best match:', {
                intent: bestMatch.intent?.tag,
                score: bestMatch.score
            });
            return bestMatch.score >= 0.25 ? bestMatch.intent : null;
        } catch (error) {
            console.error('Error matching intent:', error);
            throw error instanceof ChatbotError ? error : new IntentMatchError('Failed to match intent: ' + error.message);
        }
    }

    /**
     * Generates a response based on the matched intent
     * @param {string} query - User input query
     * @returns {Object} Response object containing the answer and matched intent
     */
    generateResponse(query) {
        const startTime = performance.now();
        try {
            if (!query) {
                return {
                    answer: "I'm sorry, I don't understand empty queries. Please ask a medical question.",
                    intent: null,
                    error: 'EMPTY_QUERY'
                };
            }

            if (typeof query !== 'string') {
                throw new ResponseGenerationError('Query must be a string');
            }

            const matchedIntent = this.findMatchingIntent(query);
            
            if (!matchedIntent) {
                if (this.metrics) {
                    this.metrics.recordIntentMatch(null);
                }
                return {
                    answer: "I'm sorry, I don't understand that medical query. Could you please rephrase it or ask about a specific medical condition?",
                    intent: null,
                    error: 'NO_MATCH'
                };
            }

            if (!matchedIntent.responses || !Array.isArray(matchedIntent.responses) || matchedIntent.responses.length === 0) {
                throw new ResponseGenerationError(`No responses available for intent: ${matchedIntent.tag}`);
            }

            // Randomly select a response from available responses for variety
            const randomIndex = Math.floor(Math.random() * matchedIntent.responses.length);
            const response = matchedIntent.responses[randomIndex];

            if (typeof response !== 'string' || response.trim().length === 0) {
                throw new ResponseGenerationError(`Invalid response for intent: ${matchedIntent.tag}`);
            }

            if (this.metrics) {
                this.metrics.recordIntentMatch(matchedIntent.tag);
            }

            const result = {
                answer: response,
                intent: matchedIntent.tag,
                error: null
            };

            if (this.metrics) {
                this.metrics.recordResponseTime(performance.now() - startTime);
            }

            return result;
        } catch (error) {
            console.error('Error generating response:', error);
            
            if (this.metrics) {
                this.metrics.recordError(
                    error instanceof IntentMatchError ? 'INTENT_MATCH_ERROR' : 'INTERNAL_ERROR',
                    error.message
                );
            }
            
            if (error instanceof IntentMatchError) {
                return {
                    answer: "Sorry, there was an error matching your query. Please try rephrasing your question.",
                    intent: null,
                    error: 'INTENT_MATCH_ERROR'
                };
            }
            
            return {
                answer: "Sorry, I encountered an error processing your query. Please try again.",
                intent: null,
                error: 'INTERNAL_ERROR'
            };
        } finally {
            if (this.metrics) {
                this.metrics.recordResponseTime(performance.now() - startTime);
            }
        }
    }
}

// Constants for chat history
const CHAT_HISTORY_KEY = 'medical_chatbot_history';
const MAX_HISTORY_LENGTH = 50; // Maximum number of messages to store

class ChatHistoryError extends ChatbotError {
    constructor(message) {
        super(message);
        this.name = 'ChatHistoryError';
    }
}

// Extend ChatbotService with chat history methods
ChatbotService.prototype.saveMessageToHistory = function(message) {
    try {
        let history = this.loadChatHistory();
        history.push(message);
        
        // Implement cleanup if history exceeds maximum length
        if (history.length > MAX_HISTORY_LENGTH) {
            history = history.slice(-MAX_HISTORY_LENGTH);
        }
        
        localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(history));
    } catch (error) {
        console.error('Error saving message to history:', error);
        throw new ChatHistoryError('Failed to save message to history: ' + error.message);
    }
};

ChatbotService.prototype.loadChatHistory = function() {
    try {
        const history = localStorage.getItem(CHAT_HISTORY_KEY);
        return history ? JSON.parse(history) : [];
    } catch (error) {
        console.error('Error loading chat history:', error);
        throw new ChatHistoryError('Failed to load chat history: ' + error.message);
    }
};

ChatbotService.prototype.clearChatHistory = function() {
    try {
        localStorage.removeItem(CHAT_HISTORY_KEY);
    } catch (error) {
        console.error('Error clearing chat history:', error);
        throw new ChatHistoryError('Failed to clear chat history: ' + error.message);
    }
};

// Export the error classes and ChatbotService
module.exports = {
    ChatbotService,
    ChatbotError,
    IntentLoadError,
    IntentMatchError,
    ResponseGenerationError,
    ChatHistoryError
};
