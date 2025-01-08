import { render, screen } from '@testing-library/react';
import App from './App';

test('renders Medical Assistant Chatbot title', () => {
  render(<App />);
  const titleElement = screen.getByText(/Medical Assistant Chatbot/i);
  expect(titleElement).toBeInTheDocument();
});
