import { createTheme } from '@mui/material/styles';

// PUBLIC_INTERFACE
const medicalTheme = createTheme({
  palette: {
    primary: {
      main: '#003442', 
      light: '#4682b4',
      dark: '#003366',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#003442', // Darker healing green for better contrast
      light: '#003442',
      dark: '#005005',
      contrastText: '#ffffff',
    },
    background: {
      default: '#f8f9fa',
      paper: '#ffffff',
    },
    error: {
      main: '#d32f2f',
      light: '#ef5350',
      dark: '#c62828',
      contrastText: '#fff',
    },
    success: {
      main: '#43a047',
      light: '#76d275',
      dark: '#00701a',
      contrastText: '#fff',
    },
    text: {
      primary: '#1a2a3a', // Darker text for better contrast
      secondary: '#445566', // Adjusted for better readability
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 500,
      color: '#1a2a3a',
      marginBottom: '1rem',
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 500,
      color: '#1a2a3a',
      marginBottom: '0.875rem',
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 500,
      color: '#1a2a3a',
      marginBottom: '0.75rem',
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.6,
      color: '#cbf5dd',
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.5,
      color: '#445566',
    },
  },
  spacing: 8,
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiCircularProgress: {
      styleOverrides: {
        root: {
          color: '#4caf50',
          '&.MuiCircularProgress-colorSecondary': {
            color: '#0277bd',
          },
        },
        circle: {
          strokeLinecap: 'round',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 500,
          padding: '8px 24px',
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            transform: 'translateY(-1px)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          },
        },
        contained: {
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
          transition: 'box-shadow 0.2s ease-in-out',
          '&:hover': {
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.12)',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
              borderColor: '#0277bd',
            },
            '&.Mui-focused': {
              boxShadow: '0 0 0 2px rgba(2, 119, 189, 0.2)',
            },
          },
          '& .MuiInputLabel-root': {
            color: '#546e7a',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
          transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 6px 24px rgba(0, 0, 0, 0.12)',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          fontWeight: 500,
          '&.MuiChip-colorPrimary': {
            backgroundColor: 'rgba(2, 119, 189, 0.12)',
            color: '#0277bd',
          },
          '&.MuiChip-colorSecondary': {
            backgroundColor: 'rgba(76, 175, 80, 0.12)',
            color: '#4caf50',
          },
        },
      },
    },
  },
});

export default medicalTheme;
