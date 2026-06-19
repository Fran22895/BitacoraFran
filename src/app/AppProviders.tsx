/* eslint-disable react-refresh/only-export-components */
import { CssBaseline, ThemeProvider } from '@mui/material'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createContext, useContext, useMemo, useState, type PropsWithChildren } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { TravelLogProvider } from '../store/TravelLogContext'
import { createAppTheme } from './theme'

interface ColorModeContextValue {
  mode: 'light' | 'dark'
  toggleColorMode: () => void
}

const ColorModeContext = createContext<ColorModeContextValue | undefined>(undefined)
const queryClient = new QueryClient()

export function useColorMode() {
  const context = useContext(ColorModeContext)
  if (!context) {
    throw new Error('useColorMode debe usarse dentro de AppProviders')
  }
  return context
}

export function AppProviders({ children }: PropsWithChildren) {
  const preferredMode = window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  const storedMode = localStorage.getItem('bitacorafran-theme') as 'light' | 'dark' | null
  const [mode, setMode] = useState<'light' | 'dark'>(storedMode ?? preferredMode)

  const colorMode = useMemo(
    () => ({
      mode,
      toggleColorMode: () => {
        setMode((currentMode) => {
          const nextMode = currentMode === 'light' ? 'dark' : 'light'
          localStorage.setItem('bitacorafran-theme', nextMode)
          return nextMode
        })
      },
    }),
    [mode],
  )

  const theme = useMemo(() => createAppTheme(mode), [mode])

  return (
    <QueryClientProvider client={queryClient}>
      <ColorModeContext.Provider value={colorMode}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <TravelLogProvider>
            <BrowserRouter>{children}</BrowserRouter>
          </TravelLogProvider>
        </ThemeProvider>
      </ColorModeContext.Provider>
    </QueryClientProvider>
  )
}
