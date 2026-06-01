import type { TemplateKey } from "@/lib/whatsapp/client";

/**
 * Catalog of the WhatsApp Content templates this app sends. Each logical key
 * maps to one approved Twilio Content template. The app sends the fully rendered
 * message text as the single body variable {{1}}, so every template only needs a
 * `{{1}}` placeholder in its body — this keeps approval simple while letting each
 * message type route to the correct WhatsApp category (authentication vs utility).
 *
 * To activate: create these in Twilio Content Template Builder, submit for
 * WhatsApp approval, then store the resulting ContentSids in
 * IntegrationConfig.twilioTemplates as { otp: "HX…", reminder: "HX…", … }.
 */
export type TemplateSpec = {
  key: TemplateKey;
  /** Suggested friendly name in Twilio Content Template Builder. */
  name: string;
  /** WhatsApp template category that fits this message type. */
  category: "AUTHENTICATION" | "UTILITY" | "MARKETING";
  /** Suggested approved body (must contain {{1}}). */
  sampleBody: string;
  description: string;
};

export const TEMPLATE_CATALOG: Record<TemplateKey, TemplateSpec> = {
  otp: {
    key: "otp",
    name: "farma_login_otp",
    category: "AUTHENTICATION",
    sampleBody: "{{1}}",
    description: "Código de acesso ao Meu Prontuário (login do paciente).",
  },
  welcome: {
    key: "welcome",
    name: "farma_welcome_consent",
    category: "UTILITY",
    sampleBody: "{{1}}",
    description: "Boas-vindas e pedido de consentimento (LGPD) no cadastro.",
  },
  reminder: {
    key: "reminder",
    name: "farma_med_reminder",
    category: "UTILITY",
    sampleBody: "{{1}}",
    description: "Lembrete de horário de medicação.",
  },
  return: {
    key: "return",
    name: "farma_return_nudge",
    category: "UTILITY",
    sampleBody: "{{1}}",
    description: "Aviso de reposição quando o medicamento deve ter acabado.",
  },
  appointment: {
    key: "appointment",
    name: "farma_appointment_confirmation",
    category: "UTILITY",
    sampleBody: "{{1}}",
    description: "Confirmação de agendamento (consulta/serviço).",
  },
  appointment_reminder: {
    key: "appointment_reminder",
    name: "farma_appointment_reminder",
    category: "UTILITY",
    sampleBody: "{{1}}",
    description: "Lembrete de compromisso nas próximas 24h.",
  },
  generic: {
    key: "generic",
    name: "farma_generic_notification",
    category: "UTILITY",
    sampleBody: "{{1}}",
    description: "Notificação genérica (mensagem da farmácia, fallback).",
  },
};

export const TEMPLATE_KEYS = Object.keys(TEMPLATE_CATALOG) as TemplateKey[];
