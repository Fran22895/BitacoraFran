/* eslint-disable react-hooks/refs */
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import DragIndicatorIcon from '@mui/icons-material/DragIndicator'
import EditIcon from '@mui/icons-material/Edit'
import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
  type SvgIconProps,
} from '@mui/material'
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useEffect, useMemo, useRef, useState, type ElementType, type ReactNode } from 'react'
import { Controller, useForm } from 'react-hook-form'
import type { z } from 'zod'

type EntityValues = Record<string, unknown>

export interface SelectOption {
  value: string
  label: string
}

export interface FieldConfig {
  name: string
  label: string
  type?: 'text' | 'number' | 'date' | 'datetime-local' | 'select' | 'boolean' | 'multiline' | 'tags' | 'url'
  options?: SelectOption[]
  helperText?: string
  gridSpan?: number
  step?: string | number
}

interface EntitySectionProps<T extends { id: string }> {
  title: string
  description?: string
  icon?: ElementType<SvgIconProps>
  items: T[]
  fields: FieldConfig[]
  defaultValues: EntityValues
  canEdit: boolean
  canCreate?: boolean
  canEditItem?: (item: T) => boolean
  canDeleteItem?: (item: T) => boolean
  schema?: z.ZodType<unknown>
  emptyLabel?: string
  addLabel?: string
  sortable?: boolean
  onCreate: (values: EntityValues) => void
  onUpdate: (id: string, values: EntityValues) => void
  onDelete: (id: string) => void
  onReorder?: (orderedIds: string[]) => void
  renderItem: (item: T) => ReactNode
}

function cloneValues(value: unknown): EntityValues {
  return JSON.parse(JSON.stringify(value ?? {})) as EntityValues
}

function getPath(source: EntityValues, path: string) {
  return path.split('.').reduce<unknown>((current, segment) => {
    if (!current || typeof current !== 'object') return undefined
    return (current as EntityValues)[segment]
  }, source)
}

function setPath(target: EntityValues, path: string, value: unknown) {
  const segments = path.split('.')
  let cursor = target

  segments.slice(0, -1).forEach((segment) => {
    const next = cursor[segment]
    if (!next || typeof next !== 'object') {
      cursor[segment] = {}
    }
    cursor = cursor[segment] as EntityValues
  })

  cursor[segments[segments.length - 1]] = value
}

function prepareFormValues(values: EntityValues, fields: FieldConfig[]) {
  const prepared = cloneValues(values)

  fields.forEach((field) => {
    if (field.type !== 'tags') return
    const value = getPath(prepared, field.name)
    if (Array.isArray(value)) {
      setPath(prepared, field.name, value.join(', '))
    }
  })

  return prepared
}

function normalizeValues(values: EntityValues, fields: FieldConfig[]) {
  const normalized = cloneValues(values)

  fields.forEach((field) => {
    const value = getPath(normalized, field.name)

    if (field.type === 'tags') {
      const tags = String(value ?? '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
      setPath(normalized, field.name, tags)
    }

    if (field.type === 'number' && typeof value === 'number' && Number.isNaN(value)) {
      setPath(normalized, field.name, undefined)
    }
  })

  return normalized
}

function SortableEntityCard({
  id,
  children,
}: {
  id: string
  children: (attributes: ReturnType<typeof useSortable>['attributes'], listeners: ReturnType<typeof useSortable>['listeners']) => ReactNode
}) {
  const sortable = useSortable({ id })
  const style = {
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
  }

  return (
    <Box ref={sortable.setNodeRef} style={style}>
      {children(sortable.attributes, sortable.listeners)}
    </Box>
  )
}

export function EntitySection<T extends { id: string }>({
  title,
  description,
  icon: Icon,
  items,
  fields,
  defaultValues,
  canEdit,
  canCreate = canEdit,
  canEditItem,
  canDeleteItem,
  schema,
  emptyLabel = 'Todavia no hay elementos.',
  addLabel = 'Anadir',
  sortable = false,
  onCreate,
  onUpdate,
  onDelete,
  onReorder,
  renderItem,
}: EntitySectionProps<T>) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<T | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const resetKeyRef = useRef<string | null>(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))
  const ids = useMemo(() => items.map((item) => item.id), [items])
  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm()

  useEffect(() => {
    if (!dialogOpen) {
      resetKeyRef.current = null
      return
    }

    const resetKey = editingItem?.id ?? 'new'
    if (resetKeyRef.current === resetKey) return

    resetKeyRef.current = resetKey
    reset(prepareFormValues(editingItem ? (editingItem as EntityValues) : defaultValues, fields))
  }, [defaultValues, dialogOpen, editingItem, fields, reset])

  const openCreate = () => {
    setEditingItem(null)
    setFormError(null)
    setDialogOpen(true)
  }

  const openEdit = (item: T) => {
    setEditingItem(item)
    setFormError(null)
    setDialogOpen(true)
  }

  const submit = handleSubmit((values) => {
    const normalized = normalizeValues(values, fields)
    const parsed = schema?.safeParse(normalized)
    if (parsed && !parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? 'Revisa los campos del formulario.')
      return
    }

    const payload = (parsed?.success ? parsed.data : normalized) as EntityValues
    if (editingItem) {
      onUpdate(editingItem.id, payload)
    } else {
      onCreate(payload)
    }

    setDialogOpen(false)
  })

  const handleDragEnd = (event: DragEndEvent) => {
    if (!event.over || event.active.id === event.over.id || !onReorder) return

    const oldIndex = ids.indexOf(String(event.active.id))
    const newIndex = ids.indexOf(String(event.over.id))
    onReorder(arrayMove(ids, oldIndex, newIndex))
  }

  const renderCard = (item: T, dragHandle?: ReactNode) => {
    const itemCanEdit = canEdit && (canEditItem?.(item) ?? true)
    const itemCanDelete = canEdit && (canDeleteItem?.(item) ?? true)

    return (
      <Card key={item.id} variant="outlined">
        <CardContent>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start' }}>
            {dragHandle}
            <Box sx={{ flex: 1, minWidth: 0 }}>{renderItem(item)}</Box>
            {(itemCanEdit || itemCanDelete) && (
              <Stack direction="row" spacing={0.5}>
                {itemCanEdit && (
                  <Tooltip title="Editar">
                    <IconButton size="small" onClick={() => openEdit(item)} aria-label="Editar">
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
                {itemCanDelete && (
                  <Tooltip title="Eliminar">
                    <IconButton size="small" color="error" onClick={() => onDelete(item.id)} aria-label="Eliminar">
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
              </Stack>
            )}
          </Stack>
        </CardContent>
      </Card>
    )
  }

  const list = (
    <Stack spacing={1.5}>
      {items.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          {emptyLabel}
        </Typography>
      ) : sortable ? (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <SortableContext items={ids} strategy={verticalListSortingStrategy}>
            {items.map((item) => (
              <SortableEntityCard key={item.id} id={item.id}>
                {(attributes, listeners) =>
                  renderCard(
                    item,
                    canEdit ? (
                      <Tooltip title="Arrastrar para ordenar">
                        <IconButton
                          size="small"
                          aria-label="Ordenar"
                          sx={{ cursor: 'grab' }}
                          {...attributes}
                          {...listeners}
                        >
                          <DragIndicatorIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    ) : undefined,
                  )
                }
              </SortableEntityCard>
            ))}
          </SortableContext>
        </DndContext>
      ) : (
        items.map((item) => renderCard(item))
      )}
    </Stack>
  )

  return (
    <Paper variant="outlined" sx={{ p: { xs: 1.5, md: 2 }, width: '100%' }}>
      <Stack spacing={2}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: { xs: 'stretch', sm: 'center' } }}>
          <Stack direction="row" spacing={1.25} sx={{ flex: 1, minWidth: 0, alignItems: 'center' }}>
            {Icon && <Icon color="primary" />}
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h6">{title}</Typography>
              {description && (
                <Typography variant="body2" color="text.secondary">
                  {description}
                </Typography>
              )}
            </Box>
          </Stack>
          {canCreate && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
              {addLabel}
            </Button>
          )}
        </Stack>

        {list}
      </Stack>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>{editingItem ? `Editar ${title.toLowerCase()}` : addLabel}</DialogTitle>
        <DialogContent>
          <Stack component="form" id={`${title}-form`} onSubmit={submit} spacing={2} sx={{ pt: 1 }}>
            {formError && (
              <Typography color="error" variant="body2">
                {formError}
              </Typography>
            )}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: 'repeat(12, 1fr)' },
                gap: 2,
              }}
            >
              {fields.map((field) => {
                const type = field.type ?? 'text'
                const gridColumn = { xs: '1 / -1', md: `span ${field.gridSpan ?? (type === 'multiline' ? 12 : 6)}` }

                if (type === 'boolean') {
                  return (
                    <Box key={field.name} sx={{ gridColumn }}>
                      <Controller
                        control={control}
                        name={field.name}
                        render={({ field: booleanField }) => (
                          <FormControlLabel
                            control={<Switch checked={Boolean(booleanField.value)} onChange={booleanField.onChange} />}
                            label={field.label}
                          />
                        )}
                      />
                    </Box>
                  )
                }

                if (type === 'select') {
                  return (
                    <Box key={field.name} sx={{ gridColumn }}>
                      <Controller
                        control={control}
                        name={field.name}
                        render={({ field: selectField }) => (
                          <TextField select label={field.label} helperText={field.helperText} fullWidth {...selectField}>
                            {(field.options ?? []).map((option) => (
                              <MenuItem key={option.value} value={option.value}>
                                {option.label}
                              </MenuItem>
                            ))}
                          </TextField>
                        )}
                      />
                    </Box>
                  )
                }

                return (
                  <Box key={field.name} sx={{ gridColumn }}>
                    <TextField
                      label={field.label}
                      type={type === 'tags' ? 'text' : type}
                      multiline={type === 'multiline'}
                      minRows={type === 'multiline' ? 3 : undefined}
                      helperText={field.helperText ?? (type === 'tags' ? 'Separar valores por coma' : undefined)}
                      fullWidth
                      slotProps={
                        type === 'date' || type === 'datetime-local' || type === 'number'
                          ? {
                              inputLabel: type === 'date' || type === 'datetime-local' ? { shrink: true } : undefined,
                              htmlInput: type === 'number' ? { step: field.step ?? 'any', inputMode: 'decimal' } : undefined,
                            }
                          : undefined
                      }
                      {...register(field.name, { valueAsNumber: type === 'number' })}
                    />
                  </Box>
                )
              })}
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancelar</Button>
          <Button type="submit" form={`${title}-form`} variant="contained" disabled={isSubmitting}>
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  )
}
