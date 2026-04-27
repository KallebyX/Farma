import { Role } from "@prisma/client";

export class UnauthorizedError extends Error {
  status = 401;
}

export class ForbiddenError extends Error {
  status = 403;
}

const ROLE_RANK: Record<Role, number> = {
  OWNER: 4,
  PHARMACIST: 3,
  ATTENDANT: 2,
  READONLY: 1,
};

/**
 * Whether `inviter` can invite someone with `targetRole`.
 *   OWNER       → any role
 *   PHARMACIST  → ATTENDANT or READONLY
 *   ATTENDANT, READONLY → none
 */
export function canInvite(inviter: Role, targetRole: Role): boolean {
  if (inviter === Role.OWNER) return true;
  if (inviter === Role.PHARMACIST) {
    return targetRole === Role.ATTENDANT || targetRole === Role.READONLY;
  }
  return false;
}

export function canManageInvitations(role: Role): boolean {
  return role === Role.OWNER || role === Role.PHARMACIST;
}

export function isAtLeast(role: Role, min: Role): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[min];
}

export function roleLabel(role: Role): string {
  switch (role) {
    case Role.OWNER:
      return "Proprietário";
    case Role.PHARMACIST:
      return "Farmacêutico responsável";
    case Role.ATTENDANT:
      return "Atendente";
    case Role.READONLY:
      return "Somente leitura";
  }
}

export type SessionContext = {
  userId: string;
  pharmacyId: string;
  role: Role;
};
