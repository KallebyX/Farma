import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import { awardPoints } from "@/lib/loyalty/service";

/**
 * Affiliate program: patients buy at partner pharmacies through trackable links
 * (UTM-tagged, with our own click id à la fbclid). Partners report purchases to
 * /api/affiliate/conversion, which credits commission + loyalty points.
 */

function token(n = 8) {
  return randomBytes(n).toString("base64url").slice(0, n + 4);
}

/** Get or create a per-patient affiliate link for a partner. */
export async function getOrCreateLink(partnerSlug: string, patientId: string | null, targetPath = "/") {
  const partner = await prisma.affiliatePartner.findUnique({ where: { slug: partnerSlug } });
  if (!partner || !partner.active) return null;

  const existing = patientId
    ? await prisma.affiliateLink.findFirst({ where: { partnerId: partner.id, patientId, targetPath } })
    : null;
  if (existing) return { partner, link: existing };

  const link = await prisma.affiliateLink.create({
    data: { code: token(6), partnerId: partner.id, patientId, targetPath },
  });
  return { partner, link };
}

/**
 * Records a click and builds the destination URL with UTMs + our click ref.
 * Returns null if the code is unknown.
 */
export async function recordClick(code: string, meta: { userAgent?: string; referer?: string }) {
  const link = await prisma.affiliateLink.findUnique({ where: { code }, include: { partner: true } });
  if (!link || !link.partner.active) return null;

  const clickRef = `mpx_${randomBytes(12).toString("base64url")}`;
  await prisma.affiliateClick.create({
    data: {
      linkId: link.id,
      patientId: link.patientId,
      clickRef,
      userAgent: meta.userAgent?.slice(0, 400),
      referer: meta.referer?.slice(0, 400),
    },
  });

  const p = link.partner;
  const base = p.baseUrl.replace(/\/$/, "");
  const url = new URL(base + (link.targetPath || "/"));
  url.searchParams.set("utm_source", p.utmSource);
  url.searchParams.set("utm_medium", p.utmMedium);
  url.searchParams.set("utm_campaign", link.campaign ?? "meuprontuario_hub");
  url.searchParams.set("utm_content", "link_in_app");
  url.searchParams.set("mpx", clickRef); // our tracking id, echoed back on conversion
  return { url: url.toString(), clickRef, partner: p };
}

type ConversionInput = {
  partnerSlug: string;
  externalOrderId: string;
  amountCents: number;
  clickRef?: string | null;
  patientId?: string | null;
};

/**
 * Records a partner-reported purchase. Idempotent on (partner, externalOrderId).
 * Attributes to a patient via clickRef (preferred) or explicit patientId, then
 * awards commission + loyalty points.
 */
export async function recordConversion(input: ConversionInput) {
  const partner = await prisma.affiliatePartner.findUnique({ where: { slug: input.partnerSlug } });
  if (!partner) return { ok: false as const, status: 404, error: "Parceiro desconhecido" };

  const existing = await prisma.affiliateConversion.findUnique({
    where: { partnerId_externalOrderId: { partnerId: partner.id, externalOrderId: input.externalOrderId } },
  });
  if (existing) return { ok: true as const, conversion: existing, duplicate: true };

  let click = null;
  if (input.clickRef) {
    click = await prisma.affiliateClick.findUnique({ where: { clickRef: input.clickRef } });
  }
  const patientId = input.patientId ?? click?.patientId ?? null;

  const commissionCents = Math.round(input.amountCents * (partner.commissionPct / 100));
  const points = patientId ? Math.round((input.amountCents / 100) * partner.pointsPerReal) : 0;

  const conversion = await prisma.affiliateConversion.create({
    data: {
      partnerId: partner.id,
      patientId,
      clickId: click?.id ?? null,
      externalOrderId: input.externalOrderId,
      amountCents: input.amountCents,
      commissionCents,
      pointsAwarded: points,
      status: "CONFIRMED",
    },
  });

  if (patientId && points > 0) {
    await awardPoints({ patientId, delta: points, reason: "affiliate_conversion", refType: "conversion", refId: conversion.id });
  }
  return { ok: true as const, conversion, duplicate: false };
}
