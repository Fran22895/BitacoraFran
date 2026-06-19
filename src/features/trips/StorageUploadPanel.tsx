import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import {
  Alert,
  Button,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useState } from 'react'
import { documentCategoryLabels } from '../../domain/constants'
import type { DocumentCategory, TravelDocument } from '../../domain/types'
import { supabase } from '../../lib/supabase'
import { uploadTripFile } from '../../lib/supabaseStorage'

interface StorageUploadPanelProps {
  tripId: string
  canEdit: boolean
  isRemoteMode: boolean
  onDocumentCreated: (document: Omit<TravelDocument, 'id' | 'tripId'>) => void
}

export function StorageUploadPanel({ tripId, canEdit, isRemoteMode, onDocumentCreated }: StorageUploadPanelProps) {
  const [category, setCategory] = useState<DocumentCategory>('reserva')
  const [title, setTitle] = useState('')
  const [relatedTo, setRelatedTo] = useState('')
  const [notes, setNotes] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!canEdit) return null

  const upload = async () => {
    if (!supabase || !isRemoteMode || !file) return

    setIsUploading(true)
    setError(null)
    try {
      const fileUrl = await uploadTripFile(supabase, tripId, category, file)
      onDocumentCreated({
        category,
        title: title || file.name,
        fileUrl,
        relatedTo: relatedTo || undefined,
        notes: notes || undefined,
      })
      setTitle('')
      setRelatedTo('')
      setNotes('')
      setFile(null)
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'No se pudo subir el archivo.')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <Paper variant="outlined" sx={{ p: { xs: 1.5, md: 2 } }}>
      <Stack spacing={2}>
        <Typography variant="h6">Subir archivo privado</Typography>
        {!isRemoteMode && (
          <Alert severity="info">
            La subida real a Storage se activa al iniciar sesion con Google y Supabase configurado.
          </Alert>
        )}
        {error && <Alert severity="error">{error}</Alert>}
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <TextField
            select
            label="Categoria"
            value={category}
            onChange={(event) => setCategory(event.target.value as DocumentCategory)}
            fullWidth
          >
            {Object.entries(documentCategoryLabels).map(([value, label]) => (
              <MenuItem key={value} value={value}>
                {label}
              </MenuItem>
            ))}
          </TextField>
          <TextField label="Titulo" value={title} onChange={(event) => setTitle(event.target.value)} fullWidth />
          <TextField label="Relacionado con" value={relatedTo} onChange={(event) => setRelatedTo(event.target.value)} fullWidth />
        </Stack>
        <TextField label="Notas" value={notes} onChange={(event) => setNotes(event.target.value)} multiline minRows={2} fullWidth />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <Button component="label" variant="outlined">
            {file ? file.name : 'Seleccionar archivo'}
            <input hidden type="file" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
          </Button>
          <Button
            variant="contained"
            startIcon={<CloudUploadIcon />}
            onClick={upload}
            disabled={!isRemoteMode || !file || isUploading}
          >
            Subir y registrar
          </Button>
        </Stack>
      </Stack>
    </Paper>
  )
}
