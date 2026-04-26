import { describe, it, expect } from "vitest";
import { Role, InvitationChannel } from "@prisma/client";
import { createInvitationSchema, acceptInvitationSchema } from "@/lib/invitations/schema";

describe("createInvitationSchema", () => {
  it("requires CRF when role is PHARMACIST", () => {
    const result = createInvitationSchema.safeParse({
      email: "p@x.com",
      role: Role.PHARMACIST,
      channels: [InvitationChannel.EMAIL],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes("crf"))).toBe(true);
    }
  });

  it("requires phone when WHATSAPP channel selected", () => {
    const result = createInvitationSchema.safeParse({
      email: "p@x.com",
      role: Role.ATTENDANT,
      channels: [InvitationChannel.WHATSAPP],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes("phone"))).toBe(true);
    }
  });

  it("rejects invalid phone format", () => {
    const result = createInvitationSchema.safeParse({
      email: "p@x.com",
      role: Role.ATTENDANT,
      phone: "11999999999",
      channels: [InvitationChannel.WHATSAPP],
    });
    expect(result.success).toBe(false);
  });

  it("normalizes email to lowercase and trims", () => {
    const result = createInvitationSchema.parse({
      email: "  P@X.COM  ",
      role: Role.ATTENDANT,
      channels: [InvitationChannel.LINK],
    });
    expect(result.email).toBe("p@x.com");
  });

  it("requires at least one channel", () => {
    const result = createInvitationSchema.safeParse({
      email: "p@x.com",
      role: Role.ATTENDANT,
      channels: [],
    });
    expect(result.success).toBe(false);
  });
});

describe("acceptInvitationSchema", () => {
  it("rejects mismatched passwords", () => {
    const result = acceptInvitationSchema.safeParse({
      token: "abc1234567",
      name: "Maria",
      password: "secretpw1",
      confirmPassword: "different",
      consent: true,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes("confirmPassword"))).toBe(true);
    }
  });

  it("requires consent=true", () => {
    const result = acceptInvitationSchema.safeParse({
      token: "abc1234567",
      name: "Maria",
      password: "secretpw1",
      confirmPassword: "secretpw1",
      consent: false,
    });
    expect(result.success).toBe(false);
  });

  it("rejects passwords shorter than 8 chars", () => {
    const result = acceptInvitationSchema.safeParse({
      token: "abc1234567",
      name: "Maria",
      password: "short",
      confirmPassword: "short",
      consent: true,
    });
    expect(result.success).toBe(false);
  });

  it("accepts a valid payload", () => {
    const result = acceptInvitationSchema.safeParse({
      token: "abc1234567",
      name: "Maria Silva",
      password: "secretpw1",
      confirmPassword: "secretpw1",
      consent: true,
    });
    expect(result.success).toBe(true);
  });
});
