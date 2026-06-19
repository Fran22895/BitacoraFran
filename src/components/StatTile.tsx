import { Box, Paper, Typography, type SvgIconProps } from '@mui/material'
import type { ElementType, ReactNode } from 'react'

interface StatTileProps {
  icon: ElementType<SvgIconProps>
  label: string
  value: ReactNode
  tone?: 'primary' | 'secondary' | 'success' | 'warning' | 'error'
}

const toneColors = {
  primary: '#0f766e',
  secondary: '#b45309',
  success: '#15803d',
  warning: '#ca8a04',
  error: '#dc2626',
}

export function StatTile({ icon: Icon, label, value, tone = 'primary' }: StatTileProps) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        minHeight: 92,
      }}
    >
      <Box
        sx={{
          width: 42,
          height: 42,
          borderRadius: 1.5,
          display: 'grid',
          placeItems: 'center',
          color: '#fff',
          bgcolor: toneColors[tone],
          flex: '0 0 auto',
        }}
      >
        <Icon fontSize="small" />
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="h6" sx={{ overflowWrap: 'anywhere' }}>
          {value}
        </Typography>
      </Box>
    </Paper>
  )
}
