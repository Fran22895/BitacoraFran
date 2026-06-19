import { describe, expect, it } from 'vitest'
import { canAssignRole, getAssignableRoles, getPermissionsForTrip } from './permissions'
import { seedTrips } from './seed'
import type { UserProfile } from './types'

describe('permisos por viaje', () => {
  const trip = seedTrips[0]

  it('da control total al propietario', () => {
    const permissions = getPermissionsForTrip(trip, { id: 'user_fran', name: 'Fran', email: 'fran@example.com' })

    expect(permissions.canRead).toBe(true)
    expect(permissions.canEdit).toBe(true)
    expect(permissions.canManageMembers).toBe(true)
    expect(permissions.canDeleteTrip).toBe(true)
  })

  it('permite editar al editor pero no gestionar miembros', () => {
    const editor: UserProfile = { id: 'user_laura', name: 'Laura', email: 'laura@example.com' }
    const permissions = getPermissionsForTrip(trip, editor)

    expect(permissions.canRead).toBe(true)
    expect(permissions.canEdit).toBe(true)
    expect(permissions.canManageMembers).toBe(false)
    expect(permissions.canDeleteTrip).toBe(false)
  })

  it('bloquea usuarios ajenos al viaje', () => {
    const permissions = getPermissionsForTrip(trip, { id: 'user_out', name: 'Out', email: 'out@example.com' })

    expect(permissions.canRead).toBe(false)
    expect(permissions.canEdit).toBe(false)
  })

  it('limita roles asignables para propietarios y admins', () => {
    expect(getAssignableRoles('owner')).toEqual(['admin', 'editor', 'reader'])
    expect(getAssignableRoles('admin')).toEqual(['editor', 'reader'])
    expect(getAssignableRoles('editor')).toEqual([])
  })

  it('evita que un admin modifique propietarios o admins', () => {
    expect(canAssignRole('admin', 'reader')).toBe(true)
    expect(canAssignRole('admin', 'editor')).toBe(true)
    expect(canAssignRole('admin', 'admin')).toBe(false)
    expect(canAssignRole('admin', 'owner')).toBe(false)
  })
})
