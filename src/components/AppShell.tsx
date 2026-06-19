import AddIcon from '@mui/icons-material/Add'
import DarkModeIcon from '@mui/icons-material/DarkMode'
import DashboardIcon from '@mui/icons-material/Dashboard'
import LightModeIcon from '@mui/icons-material/LightMode'
import LogoutIcon from '@mui/icons-material/Logout'
import MenuIcon from '@mui/icons-material/Menu'
import TravelExploreIcon from '@mui/icons-material/TravelExplore'
import {
  AppBar,
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  Divider,
  Drawer,
  IconButton,
  LinearProgress,
  Stack,
  Toolbar,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import { useState, type PropsWithChildren } from 'react'
import { Link as RouterLink, useLocation } from 'react-router-dom'
import { useColorMode } from '../app/AppProviders'
import { useTravelLog } from '../store/TravelLogContext'

interface AppShellProps extends PropsWithChildren {
  onCreateTrip?: () => void
}

export function AppShell({ children, onCreateTrip }: AppShellProps) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const [drawerOpen, setDrawerOpen] = useState(false)
  const { mode, toggleColorMode } = useColorMode()
  const { profile, logout, isRemoteMode, isLoading, lastError } = useTravelLog()
  const location = useLocation()

  const navigation = (
    <Stack spacing={1} sx={{ minWidth: 240, p: 2 }}>
      <Stack direction="row" spacing={1.5} sx={{ mb: 1, alignItems: 'center' }}>
        <TravelExploreIcon color="primary" />
        <Typography variant="h6">BitacoraFran</Typography>
      </Stack>
      <Button
        component={RouterLink}
        to="/"
        variant={location.pathname === '/' ? 'contained' : 'text'}
        startIcon={<DashboardIcon />}
        onClick={() => setDrawerOpen(false)}
        sx={{ justifyContent: 'flex-start' }}
      >
        Dashboard
      </Button>
      <Button
        variant="outlined"
        startIcon={<AddIcon />}
        onClick={() => {
          setDrawerOpen(false)
          onCreateTrip?.()
        }}
        sx={{ justifyContent: 'flex-start' }}
      >
        Nuevo viaje
      </Button>
    </Stack>
  )

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="sticky" color="inherit" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Toolbar sx={{ gap: 1.5 }}>
          {isMobile ? (
            <Tooltip title="Abrir menu">
              <IconButton edge="start" onClick={() => setDrawerOpen(true)} aria-label="Abrir menu">
                <MenuIcon />
              </IconButton>
            </Tooltip>
          ) : (
            <TravelExploreIcon color="primary" />
          )}

          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography variant="h6" noWrap>
              BitacoraFran
            </Typography>
            {!isMobile && (
              <Typography variant="caption" color="text.secondary" noWrap component="p">
                Diario practico de viajes, reservas y presupuesto
              </Typography>
            )}
          </Box>

          {!isMobile && (
            <Stack direction="row" spacing={1}>
              <Chip
                size="small"
                label={isRemoteMode ? 'Supabase' : 'Demo local'}
                color={isRemoteMode ? 'success' : 'warning'}
                variant="outlined"
              />
              <Button component={RouterLink} to="/" startIcon={<DashboardIcon />}>
                Dashboard
              </Button>
              <Button variant="contained" startIcon={<AddIcon />} onClick={onCreateTrip}>
                Nuevo viaje
              </Button>
            </Stack>
          )}

          <Tooltip title={mode === 'light' ? 'Activar modo oscuro' : 'Activar modo claro'}>
            <IconButton onClick={toggleColorMode} aria-label="Cambiar tema">
              {mode === 'light' ? <DarkModeIcon /> : <LightModeIcon />}
            </IconButton>
          </Tooltip>

          <Divider orientation="vertical" flexItem />
          <Stack direction="row" spacing={1} sx={{ minWidth: 0, alignItems: 'center' }}>
            <Avatar src={profile?.avatarUrl} alt={profile?.name} sx={{ width: 34, height: 34 }}>
              {profile?.name?.slice(0, 1)}
            </Avatar>
            {!isMobile && (
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" noWrap>
                  {profile?.name}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap component="p">
                  {profile?.email}
                </Typography>
              </Box>
            )}
          </Stack>
          <Tooltip title="Cerrar sesion">
            <IconButton onClick={logout} aria-label="Cerrar sesion">
              <LogoutIcon />
            </IconButton>
          </Tooltip>
        </Toolbar>
        {isLoading && <LinearProgress />}
      </AppBar>

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        {navigation}
      </Drawer>

      <Box component="main" sx={{ width: 'min(1400px, 100%)', mx: 'auto', p: { xs: 1.5, md: 3 } }}>
        {lastError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {lastError}
          </Alert>
        )}
        {children}
      </Box>
    </Box>
  )
}
