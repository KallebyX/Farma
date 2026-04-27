import { Role, InvitationChannel } from "@prisma/client";
import { z } from "zod";

const phoneRegex = /^\+\d{10,15}$/;

export const createInvitationSchema = z
  .object({
    email: z
      .string()
      .trim()
      .toLowerCase()
      .pipe(z.string().email("Email inválido")),
    name: z.string().trim().max(120).optional(),
    role: z.nativeEnum(Role),
    crf: z.string().trim().max(40).optional(),
    phone: z
      .string()
      .trim()
      .regex(phoneRegex, "Telefone deve estar no formato E.164, ex: +5511999999999")
      .optional()
      .or(z.literal("")),
    channels: z.array(z.nativeEnum(InvitationChannel)).min(1, "Escolha ao menos um canal"),
  })
  .superRefine((data, ctx) => {
    if (data.role === Role.PHARMACIST && !data.crf) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["crf"],
        message: "CRF é obrigatório para farmacêutico responsável",
      });
    }
    if (data.channels.includes(InvitationChannel.WHATSAPP) && !data.phone) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["phone"],
        message: "Telefone é obrigatório para envio por WhatsApp",
      });
    }
  });

export type CreateInvitationInput = z.infer<typeof createInvitationSchema>;

export const acceptInvitationSchema = z
  .object({
    token: z.string().min(10),
    name: z.string().trim().min(2).max(120),
    password: z.string().min(8, "Senha deve ter ao menos 8 caracteres").max(128),
    confirmPassword: z.string(),
    consent: z.literal(true, {
      errorMap: () => ({ message: "Você precisa aceitar os termos para continuar" }),
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "As senhas não coincidem",
  });

export type AcceptInvitationInput = z.infer<typeof acceptInvitationSchema>;
