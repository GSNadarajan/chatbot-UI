import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { createTheme, ThemeProvider } from '@mui/material';
import ChatbotComponent from '../ChatbotComponent';
import chatbotService from '../../../services/chatbotInstance';

// Mock the chatbotService instance
jest.mock('../../../services/chatbotInstance', () => ({
  generateResponse: jest.fn()
}));

describe('ChatbotComponent', () => {
  beforeEach(() => {
    // Clear mock calls before each test
    chatbotService.generateResponse.mockClear();
  });

  test('renders chatbot interface correctly', () => {
    render(<ChatbotComponent />);
    
    // Check if input field and submit button are present
    expect(screen.getByPlaceholderText('Type your message...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument();
  });

  test('handles user input and displays messages', async () => {
    const mockResponse = {
      answer: 'This is a test response',
      intent: 'test_intent'
    };
    chatbotService.generateResponse.mockResolvedValue(mockResponse);

    render(<ChatbotComponent />);
    
    // Get input field and submit button
    const input = screen.getByPlaceholderText('Type your message...');
    const submitButton = screen.getByRole('button', { name: /send/i });

    // Type a message and submit
    fireEvent.change(input, { target: { value: 'test message' } });
    fireEvent.click(submitButton);

    // Check if user message is displayed
    expect(screen.getByText('test message')).toBeInTheDocument();

    // Wait for bot response with more flexible timing
    await waitFor(() => {
      expect(screen.getByText('This is a test response')).toBeInTheDocument();
    }, { timeout: 3000 });

    // Verify chatbotService was called
    expect(chatbotService.generateResponse).toHaveBeenCalledWith('test message');
  });

  test('handles empty input', () => {
    render(<ChatbotComponent />);
    
    const submitButton = screen.getByRole('button', { name: /send/i });
    fireEvent.click(submitButton);

    // Verify chatbotService was not called
    expect(chatbotService.generateResponse).not.toHaveBeenCalled();
  });

  test('displays error message when service fails', async () => {
    chatbotService.generateResponse.mockRejectedValue(new Error('Service error'));

    render(<ChatbotComponent />);
    
    const input = screen.getByPlaceholderText('Type your message...');
    const submitButton = screen.getByRole('button', { name: /send/i });

    fireEvent.change(input, { target: { value: 'test message' } });
    fireEvent.click(submitButton);

    // Check if error message is displayed
    await waitFor(() => {
      expect(screen.queryAllByText('Failed to process your message. Please try again.')).toHaveLength(1);
    });
  });

  test('disables submit button while processing', async () => {
    const mockResponse = {
      answer: 'Test response',
      intent: 'test_intent'
    };
    chatbotService.generateResponse.mockResolvedValue(mockResponse);

    render(<ChatbotComponent />);
    
    const input = screen.getByPlaceholderText('Type your message...');
    const submitButton = screen.getByRole('button', { name: /send/i });

    fireEvent.change(input, { target: { value: 'test message' } });
    fireEvent.click(submitButton);

    // Button should be disabled and show "Sending..."
    expect(submitButton).toBeDisabled();
    expect(screen.getByText('Sending...')).toBeInTheDocument();

    // Wait for response and check if button is enabled again
    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
      expect(screen.getByText('Send')).toBeInTheDocument();
    });
  });

  describe('Message Styling', () => {
    test('applies correct styling to user messages', async () => {
      render(<ChatbotComponent />);
      
      const input = screen.getByPlaceholderText('Type your message...');
      const submitButton = screen.getByRole('button', { name: /send/i });

      fireEvent.change(input, { target: { value: 'test message' } });
      fireEvent.click(submitButton);

      const messageContainer = screen.getByText('test message').closest('div');
      const styles = window.getComputedStyle(messageContainer);
      
      expect(messageContainer).toHaveStyle({
        backgroundColor: '#00008B', // dark blue
        color: '#FFFFFF' // white text
      });
    });

    test('applies correct styling to bot messages', async () => {
      const mockResponse = {
        answer: 'Bot response',
        intent: 'test_intent'
      };
      chatbotService.generateResponse.mockResolvedValue(mockResponse);

      render(<ChatbotComponent />);
      
      const input = screen.getByPlaceholderText('Type your message...');
      const submitButton = screen.getByRole('button', { name: /send/i });

      fireEvent.change(input, { target: { value: 'test message' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        const botMessage = screen.getByText('Bot response').closest('div');
        expect(botMessage).toHaveStyle({
          backgroundColor: '#32CD32', // bright green
          color: '#FFFFFF' // white text
        });
      });
    });

    test('maintains styling after multiple messages', async () => {
      const mockResponse = {
        answer: 'Bot response',
        intent: 'test_intent'
      };
      chatbotService.generateResponse.mockResolvedValue(mockResponse);

      render(<ChatbotComponent />);
      
      // Send first message
      const input = screen.getByPlaceholderText('Type your message...');
      const submitButton = screen.getByRole('button', { name: /send/i });

      fireEvent.change(input, { target: { value: 'first message' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Bot response')).toBeInTheDocument();
      });

      // Send second message
      fireEvent.change(input, { target: { value: 'second message' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        const userMessages = screen.getAllByText(/message/);
        userMessages.forEach(msg => {
          const container = msg.closest('div');
          expect(container).toHaveStyle({
            backgroundColor: '#00008B',
            color: '#FFFFFF'
          });
        });

        const botMessages = screen.getAllByText('Bot response');
        botMessages.forEach(msg => {
          const container = msg.closest('div');
          expect(container).toHaveStyle({
            backgroundColor: '#32CD32',
            color: '#FFFFFF'
          });
        });
      });
    });

    test('applies styling to messages with different lengths', async () => {
      const longMessage = 'This is a very long message that should still maintain proper styling even with multiple lines of text and a significant amount of content';
      const mockResponse = {
        answer: 'Short response',
        intent: 'test_intent'
      };
      chatbotService.generateResponse.mockResolvedValue(mockResponse);

      render(<ChatbotComponent />);
      
      const input = screen.getByPlaceholderText('Type your message...');
      const submitButton = screen.getByRole('button', { name: /send/i });

      fireEvent.change(input, { target: { value: longMessage } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        const userMessageContainer = screen.getByText(longMessage).closest('div');
        const botMessageContainer = screen.getByText('Short response').closest('div');

        expect(userMessageContainer).toHaveStyle({
          backgroundColor: '#00008B',
          color: '#FFFFFF'
        });
        expect(botMessageContainer).toHaveStyle({
          backgroundColor: '#32CD32',
          color: '#FFFFFF'
        });
      });
    });

    test('verifies styling persistence after chat history load', async () => {
      // Mock chat history with existing messages
      const mockHistory = [
        {
          text: 'Historical user message',
          sender: 'user',
          timestamp: new Date().toISOString()
        },
        {
          text: 'Historical bot response',
          sender: 'bot',
          timestamp: new Date().toISOString(),
          intent: 'test_intent'
        }
      ];

      // Mock the loadChatHistory function
      chatbotService.loadChatHistory = jest.fn().mockReturnValue(mockHistory);

      render(<ChatbotComponent />);

      await waitFor(() => {
        const userMessage = screen.getByText('Historical user message').closest('div');
        const botMessage = screen.getByText('Historical bot response').closest('div');

        expect(userMessage).toHaveStyle({
          backgroundColor: '#00008B',
          color: '#FFFFFF'
        });
        expect(botMessage).toHaveStyle({
          backgroundColor: '#32CD32',
          color: '#FFFFFF'
        });
      });
    });
  });
});
