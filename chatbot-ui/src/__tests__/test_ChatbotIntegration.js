import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ChatbotComponent from '../components/Chatbot/ChatbotComponent';
import chatbotService from '../services/chatbotInstance';

// Mock the chatbotService instance
jest.mock('../services/chatbotInstance', () => ({
  generateResponse: jest.fn()
}));

describe('ChatbotComponent Integration Tests', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  test('should render the chatbot interface correctly', () => {
    render(<ChatbotComponent />);
    expect(screen.getByPlaceholderText('Type your message...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument();
  });

  test('should handle user message submission and display response', async () => {
    const mockResponse = {
      answer: 'Take acetaminophen for pain relief.',
      intent: 'Headache'
    };
    chatbotService.generateResponse.mockResolvedValue(mockResponse);

    render(<ChatbotComponent />);
    
    const input = screen.getByPlaceholderText('Type your message...');
    const submitButton = screen.getByRole('button', { name: /send/i });

    fireEvent.change(input, { target: { value: 'I have a headache' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('I have a headache')).toBeInTheDocument();
      expect(screen.getByText(mockResponse.answer)).toBeInTheDocument();
    });
  });

  test('should handle empty input submission', () => {
    render(<ChatbotComponent />);
    
    const submitButton = screen.getByRole('button', { name: /send/i });
    fireEvent.click(submitButton);

    expect(chatbotService.generateResponse).not.toHaveBeenCalled();
  });

  test('should show loading state while processing message', async () => {
    chatbotService.generateResponse.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({
        answer: 'Response after delay',
        intent: 'test'
      }), 100))
    );

    render(<ChatbotComponent />);
    
    const input = screen.getByPlaceholderText('Type your message...');
    const submitButton = screen.getByRole('button', { name: /send/i });

    fireEvent.change(input, { target: { value: 'test message' } });
    fireEvent.click(submitButton);

    expect(screen.getByText('Sending...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Response after delay')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /send/i })).toBeEnabled();
    });
  });

  test('should handle error in chatbot service', async () => {
    chatbotService.generateResponse.mockRejectedValue(new Error('Service error'));

    render(<ChatbotComponent />);
    
    const input = screen.getByPlaceholderText('Type your message...');
    const submitButton = screen.getByRole('button', { name: /send/i });

    fireEvent.change(input, { target: { value: 'test message' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Failed to process your message. Please try again.')).toBeInTheDocument();
    });
  });

  test('should clear input after message submission', async () => {
    chatbotService.generateResponse.mockResolvedValue({
      answer: 'Test response',
      intent: 'test'
    });

    render(<ChatbotComponent />);
    
    const input = screen.getByPlaceholderText('Type your message...');
    const submitButton = screen.getByRole('button', { name: /send/i });

    fireEvent.change(input, { target: { value: 'test message' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(input.value).toBe('');
    });
  });
});
