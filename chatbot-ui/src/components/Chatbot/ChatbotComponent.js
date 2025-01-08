import React, { useState, useEffect } from 'react';
import './ChatbotComponent.css';
import { 
  Box, 
  TextField, 
  Button, 
  Typography, 
  ThemeProvider,
  Container,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Snackbar,
  Alert
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import HealingIcon from '@mui/icons-material/Healing';
import PersonIcon from '@mui/icons-material/Person';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import chatbotService from '../../services/chatbotInstance';
import medicalTheme from '../../theme/medical-theme';

// PUBLIC_INTERFACE
const ChatbotComponent = () => {
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    try {
      const history = chatbotService.loadChatHistory();
      // Deduplicate messages based on timestamp and content
      const uniqueMessages = history.reduce((acc, message) => {
        const isDuplicate = acc.some(
          m => m.timestamp === message.timestamp && 
               m.text === message.text && 
               m.sender === message.sender
        );
        if (!isDuplicate) {
          acc.push(message);
        }
        return acc;
      }, []);
      setMessages(uniqueMessages);
    } catch (error) {
      console.error('Error loading chat history:', error);
      setMessages([]);
    }
  }, []);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  // Handle opening confirmation dialog
  const handleOpenClearDialog = () => {
    setOpenDialog(true);
  };

  // Handle closing confirmation dialog
  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  // Handle clearing chat history
  const handleClearChat = async () => {
    handleCloseDialog();
    try {
      await chatbotService.clearChatHistory();
      setMessages([]);
      setSnackbar({
        open: true,
        message: 'Chat history cleared successfully',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error clearing chat history:', error);
      setSnackbar({
        open: true,
        message: 'Failed to clear chat history. Please try again.',
        severity: 'error'
      });
    }
  };

  // Handle closing snackbar
  const handleCloseSnackbar = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  // Handle user input submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    const query = inputText.trim();
    if (!query) return;

    setError(null);
    setIsLoading(true);

    try {
      // Add user message to chat
      const userMessage = {
        text: query,
        sender: 'user',
        timestamp: new Date().toISOString()
      };

      setMessages(prevMessages => {
        const newMessages = [...prevMessages, userMessage];
        try {
          chatbotService.saveMessageToHistory(userMessage);
        } catch (error) {
          console.error('Error saving user message to history:', error);
        }
        return newMessages;
      });
      setInputText('');

      // Get response from chatbot service
      const response = await chatbotService.generateResponse(query);

      // Add bot response to chat
      const botMessage = {
        text: response.answer,
        sender: 'bot',
        timestamp: new Date().toISOString(),
        intent: response.intent
      };

      setMessages(prevMessages => {
        const newMessages = [...prevMessages, botMessage];
        try {
          chatbotService.saveMessageToHistory(botMessage);
        } catch (error) {
          console.error('Error saving bot message to history:', error);
        }
        return newMessages;
      });
    } catch (err) {
      setError('Failed to process your message. Please try again.');
      setMessages(prevMessages => [...prevMessages, {
        text: 'Failed to process your message. Please try again.',
        sender: 'bot',
        timestamp: new Date().toISOString(),
        intent: null
      }]);
      console.error('Error processing message:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ThemeProvider theme={medicalTheme}>
      <Container maxWidth="md">
        <Box 
          sx={{ 
            height: '600px', 
            display: 'flex', 
            flexDirection: 'column',
            p: 2,
            mt: 4,
            bgcolor: 'background.paper',
            borderRadius: 2,
            boxShadow: 3
          }}
        >
          <Box 
            sx={{ 
              display: 'flex', 
              alignItems: 'center',
              gap: 1,
              mb: 2,
              borderBottom: 1,
              borderColor: 'divider',
              pb: 1
            }}
          >
            <LocalHospitalIcon color="primary" />
            <Typography variant="h6" color="primary">
              Medical Assistant
            </Typography>
            <Box sx={{ marginLeft: 'auto' }}>
              <Button
                onClick={handleOpenClearDialog}
                color="inherit"
                startIcon={<DeleteOutlineIcon />}
                sx={{
                  '&:hover': {
                    backgroundColor: 'rgba(0, 0, 0, 0.04)'
                  }
                }}
              >
                Clear Chat
              </Button>
            </Box>
          </Box>
          <Box className="chat-container">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`message ${message.sender === 'user' ? 'user-message' : 'bot-message'}`}
              >
                <div className="avatar">
                  {message.sender === 'bot' ? (
                    <HealingIcon sx={{ color: 'secondary.main' }} />
                  ) : (
                    <PersonIcon sx={{ color: 'primary.main' }} />
                  )}
                </div>
                <div className="message-bubble">
                  <Typography variant="body1">{message.text}</Typography>
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      display: 'block',
                      mt: 0.5,
                      opacity: 0.8
                    }}
                  >
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </Typography>
                </div>
              </div>
            ))}
            {isLoading && (
              <Box 
                sx={{ 
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center',
                  my: 2,
                  gap: 1
                }}
              >
                <CircularProgress 
                  size={24} 
                  color="secondary" 
                  thickness={4}
                  sx={{
                    animation: 'pulse 1.5s ease-in-out infinite',
                    '@keyframes pulse': {
                      '0%': {
                        transform: 'scale(0.95)',
                        opacity: 0.5,
                      },
                      '50%': {
                        transform: 'scale(1)',
                        opacity: 1,
                      },
                      '100%': {
                        transform: 'scale(0.95)',
                        opacity: 0.5,
                      },
                    },
                  }}
                />
                <Typography 
                  variant="caption" 
                  color="text.secondary"
                  sx={{ 
                    animation: 'fadeInOut 1.5s ease-in-out infinite',
                    '@keyframes fadeInOut': {
                      '0%': { opacity: 0.5 },
                      '50%': { opacity: 1 },
                      '100%': { opacity: 0.5 },
                    }
                  }}
                >
                  Processing...
                </Typography>
              </Box>
            )}
          </Box>
          
          <Box 
            component="form" 
            onSubmit={handleSubmit}
            sx={{
              display: 'flex',
              gap: 1,
              mt: 2
            }}
          >
            <TextField
              fullWidth
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type your message..."
              variant="outlined"
              size="medium"
              disabled={isLoading}
            />
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={isLoading}
              endIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
              sx={{ minWidth: '120px' }}
            >
              {isLoading ? 'Sending...' : 'Send'}
            </Button>
          </Box>
        </Box>

        {/* Confirmation Dialog */}
        <Dialog
          open={openDialog}
          onClose={handleCloseDialog}
          aria-labelledby="clear-chat-dialog-title"
          aria-describedby="clear-chat-dialog-description"
        >
          <DialogTitle id="clear-chat-dialog-title">
            Clear Chat History
          </DialogTitle>
          <DialogContent>
            <DialogContentText id="clear-chat-dialog-description">
              Are you sure you want to clear all chat messages? This action cannot be undone.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog} color="primary">
              Cancel
            </Button>
            <Button onClick={handleClearChat} color="error" variant="contained">
              Clear
            </Button>
          </DialogActions>
        </Dialog>

        {/* Snackbar for notifications */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={handleCloseSnackbar}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert
            onClose={handleCloseSnackbar}
            severity={snackbar.severity}
            variant="filled"
            sx={{ width: '100%' }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Container>
    </ThemeProvider>
  );
};

export default ChatbotComponent;
