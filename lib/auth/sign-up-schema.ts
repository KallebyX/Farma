import { z } from "zod";

const onlyDigits = (s: string) => s.replace(/\D/g, "");

export const signUpSchema = z
  .object({
    name: z.string().trim().min(2, "Nome muito curto").max(120),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .pipe(z.string().email("Email inválido")),
    password: z.string().min(8, "Senha deve ter ao menos 8 caracteres").max(128),
    confirmPassword: z.string(),
    razaoSocial: z.string().trim().min(2, "Razão social obrigatória").max(200),
    fantasia: z
      .string()
      .trim()
      .max(200)
      .optional()
      .transform((v) => (v ? v : undefined)),
    cnpj: z
      .string()
      .transform(onlyDigits)
      .pipe(z.string().regex(/^\d{14}$/, "CNPJ deve ter 14 dígitos")),
    consent: z.literal(true, {
      errorMap: () => ({ message: "Você precisa aceitar os termos para continuar" }),
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "As senhas não coincidem",
  });

export type SignUpInput = z.infer<typeof signUpSchema>;
