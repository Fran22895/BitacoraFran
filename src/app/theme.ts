import { createTheme } from '@mui/material/styles'

export function createAppTheme(mode: 'light' | 'dark') {
  return createTheme({
    palette: {
      mode,
      primary: {
        main: mode === 'light' ? '#0f766e' : '#2dd4bf',
      },
      secondary: {
        main: mode === 'light' ? '#b45309' : '#f59e0b',
      },
      error: {
        main: '#dc2626',
      },
      background: {
        default: mode === 'light' ? '#f7f8f4' : '#101413',
        paper: mode === 'light' ? '#ffffff' : '#181f1d',
      },
    },
    typography: {
      fontFamily:
        'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      h1: { fontWeight: 800, letterSpacing: 0 },
      h2: { fontWeight: 800, letterSpacing: 0 },
      h3: { fontWeight: 800, letterSpacing: 0 },
      h4: { fontWeight: 800, letterSpacing: 0 },
      h5: { fontWeight: 800, letterSpacing: 0 },
      h6: { fontWeight: 800, letterSpacing: 0 },
      button: { textTransform: 'none', fontWeight: 700, letterSpacing: 0 },
    },
    shape: {
      borderRadius: 8,
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: { borderRadius: 8 },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: { borderRadius: 8 },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: { borderRadius: 8 },
        },
      },
      MuiTextField: {
        defaultProps: {
          size: 'small',
        },
      },
      MuiSelect: {
        defaultProps: {
          size: 'small',
        },
      },
    },
  })
}
