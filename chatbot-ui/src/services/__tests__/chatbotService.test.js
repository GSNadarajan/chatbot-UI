const { 
  ChatbotService,
  ChatbotError,
  IntentLoadError,
  IntentMatchError,
  ResponseGenerationError
} = require('../chatbotService');

// Mock dependencies
const createMockLogger = () => jest.fn();
const createMockMetrics = () => ({
  recordResponseTime: jest.fn(),
  recordIntentMatch: jest.fn(),
  recordError: jest.fn()
});

// Mock intent data for testing
const mockIntentsData = {
  intents: [
    {
      tag: 'Cuts',
      patterns: ['What to do if Cuts?', 'How to cure Cuts?', 'cuts treatment'],
      responses: ['Clean the cut and apply pressure to stop bleeding.'],
      context_set: ''
    },
    {
      tag: 'Fever',
      patterns: ['How do you treat a mild Fever?', 'what to do if i get a mild fever?', 'fever treatment'],
      responses: ['Take rest and drink plenty of fluids.', 'Stay hydrated and monitor temperature.'],
      context_set: ''
    },
    {
      tag: 'Headache',
      patterns: ['how to cure headache', 'headache treatment', 'head pain relief'],
      responses: ['Take ibuprofen for pain relief'],
      context_set: ''
    }
  ]
};

// Mock console methods to prevent noise in test output
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
console.error = jest.fn();
console.warn = jest.fn();

describe('ChatbotService Error Classes', () => {
  test('ChatbotError extends Error', () => {
    const error = new ChatbotError('test error');
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('ChatbotError');
    expect(error.message).toBe('test error');
  });

  test('IntentLoadError extends ChatbotError', () => {
    const error = new IntentLoadError('test error');
    expect(error).toBeInstanceOf(ChatbotError);
    expect(error.name).toBe('IntentLoadError');
    expect(error.message).toBe('test error');
  });

  test('IntentMatchError extends ChatbotError', () => {
    const error = new IntentMatchError('test error');
    expect(error).toBeInstanceOf(ChatbotError);
    expect(error.name).toBe('IntentMatchError');
    expect(error.message).toBe('test error');
  });

  test('ResponseGenerationError extends ChatbotError', () => {
    const error = new ResponseGenerationError('test error');
    expect(error).toBeInstanceOf(ChatbotError);
    expect(error.name).toBe('ResponseGenerationError');
    expect(error.message).toBe('test error');
  });
});

describe('ChatbotService', () => {
  let chatbotService;
  let mockLogger;

  beforeEach(() => {
    mockLogger = createMockLogger();
    mockMetrics = createMockMetrics();
    chatbotService = new ChatbotService({ 
      intentsData: mockIntentsData,
      logger: mockLogger,
      metrics: mockMetrics
    });
  });

  afterEach(() => {
    jest.resetModules();
  });

  afterAll(() => {
    // Restore console methods
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
  });

  describe('Dependency Injection', () => {
    describe('Logger Injection', () => {
      test('accepts custom logger through constructor', () => {
        const customLogger = jest.fn();
        const service = new ChatbotService({ logger: customLogger });
        
        try {
          service.loadIntents(null);
        } catch (error) {
          // Expected error
        }
        
        expect(customLogger).toHaveBeenCalled();
      });

      test('uses console.error as default logger', () => {
        const originalConsoleError = console.error;
        const mockConsoleError = jest.fn();
        console.error = mockConsoleError;

        const service = new ChatbotService();
        
        try {
          service.loadIntents(null);
        } catch (error) {
          // Expected error
        }

        expect(mockConsoleError).toHaveBeenCalled();
        console.error = originalConsoleError;
      });

      test('logger receives appropriate error context', () => {
        const customLogger = jest.fn();
        const service = new ChatbotService({ logger: customLogger });
        const errorMessage = 'Test error message';
        
        try {
          service.loadIntents({ intents: [{ invalid: 'data' }] });
        } catch (error) {
          // Expected error
        }
        
        expect(customLogger).toHaveBeenCalledWith(
          'Error loading intents:',
          expect.any(IntentLoadError)
        );
      });
    });

    describe('Metrics Injection', () => {
      test('accepts metrics service through constructor', () => {
        const metricsService = createMockMetrics();
        const service = new ChatbotService({ 
          intentsData: mockIntentsData,
          metrics: metricsService 
        });

        service.generateResponse('What to do if Cuts?');
        
        expect(metricsService.recordResponseTime).toHaveBeenCalled();
        expect(metricsService.recordIntentMatch).toHaveBeenCalledWith('Cuts');
      });

      test('metrics service records errors', () => {
        const metricsService = createMockMetrics();
        const service = new ChatbotService({ 
          metrics: metricsService 
        });

        try {
          service.loadIntents(null);
        } catch (error) {
          expect(metricsService.recordError).toHaveBeenCalledWith(
            'INTENT_LOAD_ERROR',
            expect.any(String)
          );
        }
      });

      test('handles missing metrics service gracefully', () => {
        const service = new ChatbotService({ 
          intentsData: mockIntentsData 
        });

        // Should not throw when metrics service is not provided
        expect(() => {
          service.generateResponse('What to do if Cuts?');
        }).not.toThrow();
      });
    });

    describe('Intent Data Injection', () => {
      test('accepts intents data through constructor', () => {
        const service = new ChatbotService({ intentsData: mockIntentsData });
        expect(service.intents).toEqual(mockIntentsData.intents);
      });

      test('accepts intents data through loadIntents method', () => {
        const service = new ChatbotService();
        service.loadIntents(mockIntentsData);
        expect(service.intents).toEqual(mockIntentsData.intents);
      });

      test('validates intent data structure on injection', () => {
        expect(() => {
          new ChatbotService({ 
            intentsData: { invalid: 'data' } 
          });
        }).toThrow(IntentLoadError);
      });
    });
  });

  describe('loadIntents', () => {
    test('loads intents data successfully', () => {
      expect(chatbotService.intents).toBeDefined();
      expect(chatbotService.intents.length).toBe(3);
      expect(chatbotService.intents[0].tag).toBe('Cuts');
    });

    test('throws IntentLoadError when intents data is missing', () => {
      const service = new ChatbotService({ logger: mockLogger });
      expect(() => service.loadIntents(null)).toThrow('Intent data is missing');
    });

    test('throws IntentLoadError when intents property is missing', () => {
      const service = new ChatbotService({ logger: mockLogger });
      expect(() => service.loadIntents({})).toThrow('Invalid intent data structure: missing intents property');
    });

    test('throws IntentLoadError when intents is not an array', () => {
      const service = new ChatbotService({ logger: mockLogger });
      expect(() => service.loadIntents({ intents: 'not an array' }))
        .toThrow('Invalid intent data structure: intents must be an array');
    });

    test('throws IntentLoadError when intents array is empty', () => {
      const service = new ChatbotService({ logger: mockLogger });
      expect(() => service.loadIntents({ intents: [] })).toThrow('Intent data is empty');
    });

    test('throws IntentLoadError when intent structure is invalid', () => {
      const service = new ChatbotService({ logger: mockLogger });
      expect(() => service.loadIntents({
        intents: [{
          // Missing required properties
          tag: 'Test'
        }]
      })).toThrow('Invalid intent structure: missing required properties');
    });
  });

  describe('findMatchingIntent', () => {
    test('finds exact match for intent pattern', () => {
      const query = 'What to do if Cuts?';
      const result = chatbotService.findMatchingIntent(query);
      
      expect(result).toBeDefined();
      expect(result.tag).toBe('Cuts');
    });

    test('finds partial match for intent pattern', () => {
      const query = 'I have cuts on my hand';
      const result = chatbotService.findMatchingIntent(query);
    
      expect(result).toBeDefined();
      expect(result.tag).toBe('Cuts');
    });

    test('handles case-insensitive matching', () => {
      const query = 'how to cure CUTS?';
      const result = chatbotService.findMatchingIntent(query);
      
      expect(result).toBeDefined();
      expect(result.tag).toBe('Cuts');
    });

    test('returns null for no match', () => {
      const query = 'something completely unrelated';
      const result = chatbotService.findMatchingIntent(query);
      
      expect(result).toBeNull();
    });

    test('handles empty query', () => {
      const result = chatbotService.findMatchingIntent('');
      expect(result).toBeNull();
    });

    test('handles null query', () => {
      const result = chatbotService.findMatchingIntent(null);
      expect(result).toBeNull();
    });

    test('handles undefined query', () => {
      const result = chatbotService.findMatchingIntent(undefined);
      expect(result).toBeNull();
    });

    test('throws IntentMatchError when query is not a string', () => {
      expect(() => chatbotService.findMatchingIntent(123)).toThrow('Query must be a string');
    });

    test('throws IntentMatchError when no intents are available', () => {
      chatbotService.intents = null;
      expect(() => chatbotService.findMatchingIntent('test')).toThrow('No intents available for matching');
    });

    test('skips invalid patterns and continues matching', () => {
      chatbotService.intents = [
        {
          tag: 'Test',
          patterns: [null, 'valid pattern', 123], // Invalid patterns mixed with valid ones
          responses: ['Test response']
        }
      ];

      const result = chatbotService.findMatchingIntent('valid pattern');
      expect(result).toBeDefined();
      expect(result.tag).toBe('Test');
      expect(console.warn).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    describe('Error Type Handling', () => {
      test('wraps non-ChatbotError errors in appropriate error types', () => {
        const service = new ChatbotService({ logger: mockLogger });
        
        // Test IntentLoadError wrapping
        try {
          service.loadIntents(() => {}); // Pass a function instead of object to trigger TypeError
          fail('Should have thrown an error');
        } catch (error) {
          expect(error).toBeInstanceOf(IntentLoadError);
          expect(error.message).toBe('Invalid intent data structure: missing intents property');
        }

        // Test IntentMatchError wrapping
        try {
          service.findMatchingIntent(Symbol('test')); // Pass a Symbol to trigger TypeError
          fail('Should have thrown an error');
        } catch (error) {
          expect(error).toBeInstanceOf(IntentMatchError);
          expect(error.message).toContain('Query must be a string');
        }
      });

      test('preserves original error stack trace', () => {
        const service = new ChatbotService({ logger: mockLogger });
        
        try {
          service.loadIntents(() => {});
          fail('Should have thrown an error');
        } catch (error) {
          expect(error.stack).toContain('chatbotService.test.js');
        }
      });
    });

    describe('Response Generation Error Handling', () => {
      test('handles errors in response generation gracefully', () => {
        const service = new ChatbotService({ 
          intentsData: {
            intents: [{
              tag: 'Test',
              patterns: ['test'],
              responses: [null] // Invalid response
            }]
          },
          logger: mockLogger
        });

        const response = service.generateResponse('test');
        expect(response.error).toBe('INTERNAL_ERROR');
        expect(response.answer).toBe('Sorry, I encountered an error processing your query. Please try again.');
      });

      test('handles missing responses array', () => {
        const service = new ChatbotService({ 
          intentsData: {
            intents: [{
              tag: 'Test',
              patterns: ['test']
              // Missing responses array
            }]
          },
          logger: mockLogger
        });

        expect(() => {
          service.loadIntents(service.intentsData);
        }).toThrow(IntentLoadError);
      });

      test('handles empty responses array', () => {
        const service = new ChatbotService({ 
          intentsData: {
            intents: [{
              tag: 'Test',
              patterns: ['test'],
              responses: [] // Empty responses array
            }]
          },
          logger: mockLogger
        });

        const response = service.generateResponse('test');
        expect(response.error).toBe('INTERNAL_ERROR');
      });
    });

    describe('Error Logging', () => {
      test('logs errors with appropriate context', () => {
        const customLogger = jest.fn();
        const service = new ChatbotService({ 
          logger: customLogger 
        });

        try {
          service.loadIntents(null);
        } catch (error) {
          expect(customLogger).toHaveBeenCalledWith(
            'Error loading intents:',
            expect.any(IntentLoadError)
          );
        }
      });

      test('includes error details in logs', () => {
        const customLogger = jest.fn();
        const service = new ChatbotService({ 
          logger: customLogger 
        });

        try {
          service.findMatchingIntent(123);
        } catch (error) {
          expect(customLogger).toHaveBeenCalledWith(
            expect.any(String),
            expect.objectContaining({
              name: 'IntentMatchError',
              message: expect.stringContaining('Query must be a string')
            })
          );
        }
      });
    });
  });

  describe('Performance', () => {
    let service;
    let largeIntentsData;

    beforeEach(() => {
      // Create a large set of test intents with diverse patterns
      largeIntentsData = {
        intents: Array(1000).fill(null).map((_, i) => ({
          tag: `Intent${i}`,
          patterns: [
            `pattern${i}`,
            `test${i}`,
            `example${i}`,
            `medical condition ${i}`,
            `symptom ${i} treatment`,
            `how to cure ${i}`,
            `what to do for ${i}`
          ],
          responses: [`response${i}`, `alternative response ${i}`]
        }))
      };

      service = new ChatbotService({ 
        intentsData: largeIntentsData,
        metrics: mockMetrics
      });
    });

    describe('Query Processing Performance', () => {
      test('handles large number of intents efficiently', () => {
        const startTime = performance.now();
        const result = service.findMatchingIntent('test500');
        const endTime = performance.now();

        expect(endTime - startTime).toBeLessThan(500); // Should complete within 500ms
        expect(result).toBeTruthy();
        expect(result.tag).toBe('Intent500');
      });

      test('processes complex queries efficiently', () => {
        const complexQueries = [
          'what is the best treatment for medical condition 42 with symptom',
          'how do I cure this severe condition example 123',
          'I need help with pattern 789 and symptom treatment',
          'multiple symptoms like test 234 and example 567'
        ];

        const times = complexQueries.map(query => {
          const start = performance.now();
          service.findMatchingIntent(query);
          return performance.now() - start;
        });

        const maxTime = Math.max(...times);
        const averageTime = times.reduce((a, b) => a + b) / times.length;

        expect(maxTime).toBeLessThan(100); // Max processing time under 100ms
        expect(averageTime).toBeLessThan(50); // Average under 50ms
      });

      test('maintains performance with fuzzy matching', () => {
        const fuzzyQueries = [
          'treatmnt for mdical condition 42', // Misspelled
          'how to cure condtion exmple 123', // Missing letters
          'symptm 789 treatmnt', // Multiple misspellings
          'what to do for intent5 condition' // Mixed terms
        ];

        const times = fuzzyQueries.map(query => {
          const start = performance.now();
          service.findMatchingIntent(query);
          return performance.now() - start;
        });

        const maxTime = Math.max(...times);
        expect(maxTime).toBeLessThan(150); // Fuzzy matching within 150ms
      });
    });

    describe('Response Generation Timing', () => {
      test('handles concurrent requests efficiently', async () => {
        const requests = Array(100).fill(null).map(() => 
          Promise.resolve(service.generateResponse('What to do if medical condition 42?'))
        );

        const startTime = performance.now();
        const responses = await Promise.all(requests);
        const endTime = performance.now();

        expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
        expect(responses).toHaveLength(100);
        expect(responses.every(r => r.error === null)).toBe(true);
      });

      test('maintains consistent response times under load', () => {
        const queries = Array(50).fill(null).map((_, i) => 
          `how to treat medical condition ${i}`
        );

        const times = queries.map(() => {
          const start = performance.now();
          service.generateResponse(queries[0]);
          return performance.now() - start;
        });

        const averageTime = times.reduce((a, b) => a + b) / times.length;
        const maxTime = Math.max(...times);
        const minTime = Math.min(...times);
        const variance = times.reduce((sum, time) => sum + Math.pow(time - averageTime, 2), 0) / times.length;
        const stdDev = Math.sqrt(variance);

        expect(averageTime).toBeLessThan(50); // Average response time under 50ms
        expect(maxTime).toBeLessThan(100); // Max response time under 100ms
        expect(maxTime - minTime).toBeLessThan(50); // Time variance under 50ms
        expect(stdDev).toBeLessThan(25); // Standard deviation under 25ms
      });

      test('processes responses within threshold for different query lengths', () => {
        const queryLengths = [1, 5, 10, 20, 50]; // Words per query
        const results = queryLengths.map(length => {
          const query = Array(length).fill('test').join(' ');
          const start = performance.now();
          service.generateResponse(query);
          return performance.now() - start;
        });

        results.forEach((time, index) => {
          const maxAllowedTime = 20 + (queryLengths[index] * 2); // Base 20ms + 2ms per word
          expect(time).toBeLessThan(maxAllowedTime);
        });
      });
    });

    describe('Memory Usage', () => {
      test('maintains stable memory usage during intent matching', () => {
        const initialMemory = process.memoryUsage().heapUsed;
        
        // Perform multiple intent matches
        for (let i = 0; i < 1000; i++) {
          service.findMatchingIntent(`test query ${i}`);
        }

        const finalMemory = process.memoryUsage().heapUsed;
        const memoryIncrease = finalMemory - initialMemory;
        
        // Memory increase should be reasonable (less than 10MB)
        expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
      });

      test('handles memory efficiently during response generation', () => {
        const initialMemory = process.memoryUsage().heapUsed;
        
        // Generate multiple responses
        for (let i = 0; i < 500; i++) {
          service.generateResponse(`medical condition ${i} treatment`);
        }

        const finalMemory = process.memoryUsage().heapUsed;
        const memoryIncrease = finalMemory - initialMemory;
        
        // Memory increase should be reasonable (less than 5MB)
        expect(memoryIncrease).toBeLessThan(5 * 1024 * 1024);
      });

      test('memory usage remains stable with large datasets', () => {
        const memoryMeasurements = [];
        
        // Take memory measurements while processing queries
        for (let i = 0; i < 10; i++) {
          const beforeMemory = process.memoryUsage().heapUsed;
          
          // Process a batch of queries
          for (let j = 0; j < 100; j++) {
            service.generateResponse(`test query ${i * 100 + j}`);
          }
          
          const afterMemory = process.memoryUsage().heapUsed;
          memoryMeasurements.push(afterMemory - beforeMemory);
        }

        // Calculate memory stability metrics
        const avgMemoryChange = memoryMeasurements.reduce((a, b) => a + b, 0) / memoryMeasurements.length;
        const maxMemorySpike = Math.max(...memoryMeasurements);

        expect(avgMemoryChange).toBeLessThan(1 * 1024 * 1024); // Average change < 1MB
        expect(maxMemorySpike).toBeLessThan(2 * 1024 * 1024); // Max spike < 2MB
      });
    });
  });

  describe('generateResponse', () => {
    test('generates response for matching intent', () => {
      const query = 'What to do if Cuts?';
      const response = chatbotService.generateResponse(query);
      
      expect(response).toEqual({
        answer: 'Clean the cut and apply pressure to stop bleeding.',
        intent: 'Cuts',
        error: null
      });
    });

    test('generates default response for non-matching query', () => {
      const query = 'something completely unrelated';
      const response = chatbotService.generateResponse(query);
      
      expect(response).toEqual({
        answer: "I'm sorry, I don't understand that medical query. Could you please rephrase it or ask about a specific medical condition?",
        intent: null,
        error: 'NO_MATCH'
      });
    });

    test('handles empty query', () => {
      const response = chatbotService.generateResponse('');
      
      expect(response).toEqual({
        answer: "I'm sorry, I don't understand empty queries. Please ask a medical question.",
        intent: null,
        error: 'EMPTY_QUERY'
      });
    });

    test('handles null query', () => {
      const response = chatbotService.generateResponse(null);
      
      expect(response).toEqual({
        answer: "I'm sorry, I don't understand empty queries. Please ask a medical question.",
        intent: null,
        error: 'EMPTY_QUERY'
      });
    });

    test('throws ResponseGenerationError when query is not a string', () => {
      const response = chatbotService.generateResponse(123);
      expect(response).toEqual({
        answer: "Sorry, I encountered an error processing your query. Please try again.",
        intent: null,
        error: 'INTERNAL_ERROR'
      });
    });

    test('handles error in intent matching', () => {
      // Mock findMatchingIntent to throw an error
      const originalFindMatchingIntent = chatbotService.findMatchingIntent;
      chatbotService.findMatchingIntent = jest.fn().mockImplementation(() => {
        throw new Error('Test error');
      });

      const response = chatbotService.generateResponse('test query');
    
      expect(response).toEqual({
        answer: "Sorry, I encountered an error processing your query. Please try again.",
        intent: null,
        error: 'INTERNAL_ERROR'
      });

      // Restore original method
      chatbotService.findMatchingIntent = originalFindMatchingIntent;
    });

    test('handles invalid response data in matched intent', () => {
      // Mock an intent with invalid responses
      chatbotService.intents = [{
        tag: 'Test',
        patterns: ['test pattern'],
        responses: [] // Empty responses array
      }];

      const response = chatbotService.generateResponse('test pattern');
      expect(response).toEqual({
        answer: "Sorry, I encountered an error processing your query. Please try again.",
        intent: null,
        error: 'INTERNAL_ERROR'
      });
    });

    test('handles multiple valid responses for an intent', () => {
      // Use a query that matches the Fever intent
      const query = 'How do you treat a mild Fever?';
      const response = chatbotService.generateResponse(query);
      
      expect(response.intent).toBe('Fever');
      expect(['Take rest and drink plenty of fluids.', 'Stay hydrated and monitor temperature.'])
        .toContain(response.answer);
      expect(response.error).toBeNull();
    });
  });
});
