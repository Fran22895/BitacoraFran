import CloseIcon from '@mui/icons-material/Close'
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Tooltip,
} from '@mui/material'
import { useEffect, useRef } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { tripStatusLabels } from '../domain/constants'
import { tripFormSchema } from '../domain/schemas'
import type { Trip } from '../domain/types'
import type { TripDraft } from '../store/TravelLogContext'

type TripFormValues = {
  title: string
  status: TripDraft['status']
  isPublic: boolean
  destinationsText: string
  startDate: string
  endDate: string
  coverImageUrl: string
  companionsText: string
  budgetAmount: number
  baseCurrency: string
  tagsText: string
  notes: string
}

interface TripFormDialogProps {
  open: boolean
  trip?: Trip
  onClose: () => void
  onSave: (draft: TripDraft) => void
}

function listToText(values?: string[]) {
  return values?.join(', ') ?? ''
}

function textToList(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function getDefaultValues(trip?: Trip): TripFormValues {
  return {
    title: trip?.title ?? '',
    status: trip?.status ?? 'planned',
    isPublic: trip?.isPublic ?? false,
    destinationsText: listToText(trip?.destinations),
    startDate: trip?.startDate ?? new Date().toISOString().slice(0, 10),
    endDate: trip?.endDate ?? new Date().toISOString().slice(0, 10),
    coverImageUrl: trip?.coverImageUrl ?? '',
    companionsText: listToText(trip?.companions),
    budgetAmount: trip?.budgetAmount ?? 0,
    baseCurrency: trip?.baseCurrency ?? 'EUR',
    tagsText: listToText(trip?.tags),
    notes: trip?.notes ?? '',
  }
}

export function TripFormDialog({ open, trip, onClose, onSave }: TripFormDialogProps) {
  const resetKeyRef = useRef<string | null>(null)
  const {
    control,
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<TripFormValues>({
    defaultValues: getDefaultValues(trip),
  })

  useEffect(() => {
    if (!open) {
      resetKeyRef.current = null
      return
    }

    const resetKey = trip?.id ?? 'new'
    if (resetKeyRef.current === resetKey) return

    resetKeyRef.current = resetKey
    reset(getDefaultValues(trip))
  }, [open, reset, trip])

  const submit = handleSubmit((values) => {
    const parsed = tripFormSchema.safeParse(values)
    if (!parsed.success) {
      const issue = parsed.error.issues[0]
      if (issue?.path[0]) {
        setError(issue.path[0] as keyof TripFormValues, { message: issue.message })
      }
      return
    }

    onSave({
      title: values.title,
      status: values.status,
      isPublic: values.isPublic,
      destinations: textToList(values.destinationsText),
      startDate: values.startDate,
      endDate: values.endDate,
      coverImageUrl: values.coverImageUrl || undefined,
      companions: textToList(values.companionsText),
      budgetAmount: Number(values.budgetAmount),
      baseCurrency: values.baseCurrency.toUpperCase(),
      tags: textToList(values.tagsText),
      notes: values.notes || undefined,
    })
    onClose()
  })

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ pr: 7 }}>
        {trip ? 'Editar viaje' : 'Nuevo viaje'}
        <Tooltip title="Cerrar">
          <IconButton onClick={onClose} aria-label="Cerrar" sx={{ position: 'absolute', right: 12, top: 12 }}>
            <CloseIcon />
          </IconButton>
        </Tooltip>
      </DialogTitle>
      <DialogContent>
        <Stack component="form" id="trip-form" onSubmit={submit} spacing={2} sx={{ pt: 1 }}>
          <TextField
            label="Nombre del viaje"
            {...register('title')}
            error={Boolean(errors.title)}
            helperText={errors.title?.message}
            fullWidth
          />
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <TextField select label="Estado" {...field} fullWidth>
                  {Object.entries(tripStatusLabels).map(([value, label]) => (
                    <MenuItem key={value} value={value}>
                      {label}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
            <TextField
              label="Moneda base"
              {...register('baseCurrency')}
              error={Boolean(errors.baseCurrency)}
              helperText={errors.baseCurrency?.message}
              fullWidth
            />
            <TextField
              label="Presupuesto"
              type="number"
              {...register('budgetAmount', { valueAsNumber: true })}
              slotProps={{ htmlInput: { step: '0.01', inputMode: 'decimal' } }}
              error={Boolean(errors.budgetAmount)}
              helperText={errors.budgetAmount?.message}
              fullWidth
            />
            <Controller
              control={control}
              name="isPublic"
              render={({ field }) => (
                <FormControlLabel
                  control={<Switch checked={Boolean(field.value)} onChange={(event) => field.onChange(event.target.checked)} />}
                  label="Viaje publico"
                  sx={{ minWidth: { md: 180 }, alignSelf: 'center' }}
                />
              )}
            />
          </Stack>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField
              label="Fecha inicio"
              type="date"
              {...register('startDate')}
              error={Boolean(errors.startDate)}
              helperText={errors.startDate?.message}
              slotProps={{ inputLabel: { shrink: true } }}
              fullWidth
            />
            <TextField
              label="Fecha fin"
              type="date"
              {...register('endDate')}
              error={Boolean(errors.endDate)}
              helperText={errors.endDate?.message}
              slotProps={{ inputLabel: { shrink: true } }}
              fullWidth
            />
          </Stack>
          <TextField
            label="Destinos separados por coma"
            {...register('destinationsText')}
            error={Boolean(errors.destinationsText)}
            helperText={errors.destinationsText?.message}
            fullWidth
          />
          <TextField label="URL imagen de portada" {...register('coverImageUrl')} fullWidth />
          <TextField label="Acompanantes separados por coma" {...register('companionsText')} fullWidth />
          <TextField label="Etiquetas separadas por coma" {...register('tagsText')} fullWidth />
          <TextField label="Notas" {...register('notes')} multiline minRows={3} fullWidth />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button type="submit" form="trip-form" variant="contained" disabled={isSubmitting}>
          Guardar
        </Button>
      </DialogActions>
    </Dialog>
  )
}
