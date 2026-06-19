import GoogleIcon from '@mui/icons-material/Google'
import TravelExploreIcon from '@mui/icons-material/TravelExplore'
import {
  Alert,
  Box,
  Button,
  Container,
  Paper,
  Stack,
  Typography,
} from '@mui/material'
import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { isSupabaseConfigured, signInWithGoogle } from '../../lib/supabase'
import { useTravelLog } from '../../store/TravelLogContext'

export function AuthPage() {
  const { profile, loginAsDemo } = useTravelLog()
  const [error, setError] = useState<string | null>(null)

  if (profile) {
    return <Navigate to="/" replace />
  }

  const handleGoogleLogin = async () => {
    setError(null)
    try {
      await signInWithGoogle()
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'No se pudo iniciar sesion con Google.')
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        px: 2,
        bgcolor: 'background.default',
      }}
    >
      <Container maxWidth="sm">
        <Paper variant="outlined" sx={{ p: { xs: 3, md: 4 } }}>
          <Stack spacing={3} sx={{ alignItems: 'flex-start' }}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              <TravelExploreIcon color="primary" fontSize="large" />
              <Box>
                <Typography variant="h4">BitacoraFran</Typography>
                <Typography color="text.secondary">Tu diario practico de viajes</Typography>
              </Box>
            </Stack>

            <Typography>
              Entra con Google para sincronizar viajes, permisos, documentos y diarios. Mientras configuras Supabase,
              puedes usar el modo demo con datos guardados en este navegador.
            </Typography>

            {!isSupabaseConfigured && (
              <Alert severity="info">
                Supabase aun no esta configurado. Revisa `docs/supabase-setup.md` cuando quieras activar Google Auth.
              </Alert>
            )}

            {error && <Alert severity="error">{error}</Alert>}

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ width: '100%' }}>
              <Button
                variant="contained"
                size="large"
                startIcon={<GoogleIcon />}
                onClick={handleGoogleLogin}
                disabled={!isSupabaseConfigured}
                fullWidth
              >
                Entrar con Google
              </Button>
              <Button variant="outlined" size="large" onClick={loginAsDemo} fullWidth>
                Usar demo local
              </Button>
            </Stack>
          </Stack>
        </Paper>
      </Container>
    </Box>
  )
}
