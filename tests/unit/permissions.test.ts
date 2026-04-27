import { describe, it, expect } from "vitest";
import { Role } from "@prisma/client";
import { canInvite, canManageInvitations, isAtLeast, roleLabel } from "@/lib/auth/permissions";

describe("canInvite", () => {
  it("OWNER can invite anyone, including other OWNERs", () => {
    expect(canInvite(Role.OWNER, Role.OWNER)).toBe(true);
    expect(canInvite(Role.OWNER, Role.PHARMACIST)).toBe(true);
    expect(canInvite(Role.OWNER, Role.ATTENDANT)).toBe(true);
    expect(canInvite(Role.OWNER, Role.READONLY)).toBe(true);
  });

  it("PHARMACIST can invite ATTENDANT and READONLY only", () => {
    expect(canInvite(Role.PHARMACIST, Role.OWNER)).toBe(false);
    expect(canInvite(Role.PHARMACIST, Role.PHARMACIST)).toBe(false);
    expect(canInvite(Role.PHARMACIST, Role.ATTENDANT)).toBe(true);
    expect(canInvite(Role.PHARMACIST, Role.READONLY)).toBe(true);
  });

  it("ATTENDANT and READONLY cannot invite anyone", () => {
    for (const target of [Role.OWNER, Role.PHARMACIST, Role.ATTENDANT, Role.READONLY]) {
      expect(canInvite(Role.ATTENDANT, target)).toBe(false);
      expect(canInvite(Role.READONLY, target)).toBe(false);
    }
  });
});

describe("canManageInvitations", () => {
  it("only OWNER and PHARMACIST can manage invitations", () => {
    expect(canManageInvitations(Role.OWNER)).toBe(true);
    expect(canManageInvitations(Role.PHARMACIST)).toBe(true);
    expect(canManageInvitations(Role.ATTENDANT)).toBe(false);
    expect(canManageInvitations(Role.READONLY)).toBe(false);
  });
});

describe("isAtLeast", () => {
  it("ranks roles correctly", () => {
    expect(isAtLeast(Role.OWNER, Role.PHARMACIST)).toBe(true);
    expect(isAtLeast(Role.PHARMACIST, Role.OWNER)).toBe(false);
    expect(isAtLeast(Role.READONLY, Role.READONLY)).toBe(true);
    expect(isAtLeast(Role.ATTENDANT, Role.READONLY)).toBe(true);
  });
});

describe("roleLabel", () => {
  it("returns localized labels", () => {
    expect(roleLabel(Role.OWNER)).toBe("Proprietário");
    expect(roleLabel(Role.PHARMACIST)).toBe("Farmacêutico responsável");
    expect(roleLabel(Role.ATTENDANT)).toBe("Atendente");
    expect(roleLabel(Role.READONLY)).toBe("Somente leitura");
  });
});
