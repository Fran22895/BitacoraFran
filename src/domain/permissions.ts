import type { Trip, TripRole, UserProfile } from './types'

export interface PermissionSet {
  canRead: boolean
  canEdit: boolean
  canManageMembers: boolean
  canDeleteTrip: boolean
  role?: TripRole
}

const roleRank: Record<TripRole, number> = {
  reader: 1,
  editor: 2,
  admin: 3,
  owner: 4,
}

export function getUserRoleForTrip(trip: Trip, user?: UserProfile | null): TripRole | undefined {
  if (!user) return undefined
  if (trip.ownerId === user.id) return 'owner'
  return trip.members.find((member) => member.userId === user.id)?.role
}

export function getPermissionsForTrip(trip: Trip, user?: UserProfile | null): PermissionSet {
  const role = getUserRoleForTrip(trip, user)
  const rank = role ? roleRank[role] : 0

  return {
    role,
    canRead: rank >= roleRank.reader || trip.isPublic,
    canEdit: rank >= roleRank.editor,
    canManageMembers: rank >= roleRank.admin,
    canDeleteTrip: rank >= roleRank.owner,
  }
}

export function canAssignRole(currentRole: TripRole, targetRole: TripRole) {
  if (currentRole === 'owner') return true
  if (currentRole === 'admin') return targetRole === 'reader' || targetRole === 'editor'
  return false
}

export function getAssignableRoles(currentRole?: TripRole) {
  if (currentRole === 'owner') return ['admin', 'editor', 'reader'] satisfies TripRole[]
  if (currentRole === 'admin') return ['editor', 'reader'] satisfies TripRole[]
  return [] satisfies TripRole[]
}
