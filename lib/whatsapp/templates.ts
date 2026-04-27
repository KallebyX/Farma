import type { WhatsAppOutbound } from "@/lib/whatsapp/client";
import { summarizePosology, type PosologyInput } from "@/lib/prescriptions/posology";

const HHmm = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" });

export function consentRequest(args: {
  phone: string;
  patientName: string;
  pharmacyName: string;
}): WhatsAppOutbound {
  return {
    kind: "buttons",
    phone: args.phone,
    text: `Olá, ${firstName(args.patientName)}! 👋\n\nA *${args.pharmacyName}* ativou para você o serviço gratuito de lembrete de medicação e notificação de reações adversas.\n\nVocê autoriza o tratamento dos seus dados de saúde para esse fim, conforme a LGPD?\n\nResponda /privacidade a qualquer momento para mudar sua escolha.`,
    buttons: [
      { id: "consent_yes", label: "✅ Aceito" },
      { id: "consent_no", label: "❌ Não aceito" },
    ],
  };
}

export function consentConfirmation(args: { phone: string; patientName: string }): WhatsAppOutbound {
  return {
    kind: "text",
    phone: args.phone,
    text: `Perfeito, ${firstName(args.patientName)}! Seu cadastro está ativo. ✅\n\nA partir de agora vou te lembrar dos seus remédios. Comandos disponíveis:\n• /meusremedios — ver lista\n• /pausar — pausar lembretes\n• /reacao — relatar reação adversa\n• /sair — encerrar`,
  };
}

export function consentDeclined(args: { phone: string }): WhatsAppOutbound {
  return {
    kind: "text",
    phone: args.phone,
    text: "Tudo bem. Seu cadastro foi removido e você não receberá mais mensagens nossas. Se mudar de ideia, peça para a farmácia te cadastrar novamente.",
  };
}

export function reminderMessage(args: {
  phone: string;
  patientName: string;
  medicationLabel: string;
  doseAmount: string;
  reminderId: string;
  scheduledFor: Date;
}): WhatsAppOutbound {
  return {
    kind: "buttons",
    phone: args.phone,
    text: `🔔 Hora do remédio, ${firstName(args.patientName)}!\n\n💊 *${args.medicationLabel}* — ${args.doseAmount}\n🕐 ${HHmm.format(args.scheduledFor)}`,
    buttons: [
      { id: `r:${args.reminderId}:taken`, label: "✅ Tomei" },
      { id: `r:${args.reminderId}:defer`, label: "⏰ Adiar 30min" },
      { id: `r:${args.reminderId}:refuse`, label: "❌ Não vou tomar" },
    ],
  };
}

export function lateConfirmationFollowup(args: {
  phone: string;
  reminderId: string;
  medicationLabel: string;
  scheduledFor: Date;
}): WhatsAppOutbound {
  return {
    kind: "buttons",
    phone: args.phone,
    text: `Você conseguiu tomar o *${args.medicationLabel}* das ${HHmm.format(args.scheduledFor)}?`,
    buttons: [
      { id: `r:${args.reminderId}:taken-late`, label: "✅ Sim, tomei" },
      { id: `r:${args.reminderId}:missed`, label: "❌ Não tomei" },
    ],
  };
}

export function refusalReasonPrompt(args: { phone: string; reminderId: string }): WhatsAppOutbound {
  return {
    kind: "buttons",
    phone: args.phone,
    text: "Tudo bem. Pode me dizer o motivo? Isso ajuda seu farmacêutico a te apoiar melhor.",
    buttons: [
      { id: `r:${args.reminderId}:reason:no-stock`, label: "Sem o remédio" },
      { id: `r:${args.reminderId}:reason:felt-bad`, label: "Me senti mal" },
      { id: `r:${args.reminderId}:reason:other`, label: "Outro motivo" },
    ],
  };
}

export function ramSeverityPrompt(args: { phone: string }): WhatsAppOutbound {
  return {
    kind: "buttons",
    phone: args.phone,
    text: "Como você classifica a intensidade?",
    buttons: [
      { id: "ram:severity:mild", label: "😐 Leve" },
      { id: "ram:severity:moderate", label: "😟 Moderada" },
      { id: "ram:severity:severe", label: "🚨 Grave" },
    ],
  };
}

export function ramSevereWarning(args: { phone: string }): WhatsAppOutbound {
  return {
    kind: "text",
    phone: args.phone,
    text: "⚠️ Pelo que você descreveu, recomendo *fortemente* que procure atendimento médico agora.\n\n📞 SAMU: 192\n\nAvisei o farmacêutico responsável da sua farmácia. Se piorar, ligue 192.",
  };
}

export function ramAcknowledgement(args: { phone: string }): WhatsAppOutbound {
  return {
    kind: "text",
    phone: args.phone,
    text: "Obrigado por relatar — isso é muito importante. O farmacêutico responsável vai revisar seu caso. Se tiver dúvidas, ele entrará em contato.\n\n💡 Se piorar, procure atendimento médico imediatamente.",
  };
}

export function meusRemediosList(args: {
  phone: string;
  prescriptions: { medicationLabel: string; posology: PosologyInput & { doseAmount: string; instructions?: string | null } }[];
}): WhatsAppOutbound {
  if (args.prescriptions.length === 0) {
    return {
      kind: "text",
      phone: args.phone,
      text: "Você não tem medicamentos cadastrados no momento.",
    };
  }
  const lines = args.prescriptions
    .map((p, i) => `${i + 1}. *${p.medicationLabel}* — ${summarizePosology(p.posology)}`)
    .join("\n");
  return {
    kind: "text",
    phone: args.phone,
    text: `📋 *Seus remédios*\n\n${lines}`,
  };
}

export function pausedConfirmation(args: { phone: string }): WhatsAppOutbound {
  return {
    kind: "text",
    phone: args.phone,
    text: "Lembretes pausados. Quando quiser voltar, mande /voltar.",
  };
}

export function resumedConfirmation(args: { phone: string }): WhatsAppOutbound {
  return {
    kind: "text",
    phone: args.phone,
    text: "Lembretes reativados. ✅",
  };
}

export function withdrawnConfirmation(args: { phone: string }): WhatsAppOutbound {
  return {
    kind: "text",
    phone: args.phone,
    text: "Tudo certo. Seus dados foram marcados para exclusão e você não receberá mais mensagens.",
  };
}

export function unknownCommandHelp(args: { phone: string }): WhatsAppOutbound {
  return {
    kind: "text",
    phone: args.phone,
    text: "Não entendi. Comandos disponíveis:\n• /meusremedios\n• /pausar  /voltar\n• /reacao\n• /privacidade  /sair",
  };
}

export function returnReminder(args: {
  phone: string;
  patientName: string;
  pharmacyName: string;
  medicationLabel: string;
  expectationId: string;
}): WhatsAppOutbound {
  return {
    kind: "buttons",
    phone: args.phone,
    text: `📦 Olá, ${firstName(args.patientName)}! Pelos meus cálculos, seu *${args.medicationLabel}* já deve ter acabado.\n\nVocê comprou reposição?`,
    buttons: [
      { id: `ret:${args.expectationId}:restocked-here`, label: "✅ Comprei aqui" },
      { id: `ret:${args.expectationId}:restocked-away`, label: "Comprei em outro lugar" },
      { id: `ret:${args.expectationId}:stopping`, label: "Vou parar o tratamento" },
    ],
  };
}

export function returnAcknowledgement(args: {
  phone: string;
  response: "restocked-here" | "restocked-away" | "stopping";
}): WhatsAppOutbound {
  if (args.response === "restocked-here") {
    return {
      kind: "text",
      phone: args.phone,
      text: "Que bom! 💙 Continuamos te lembrando dos horários normalmente.",
    };
  }
  if (args.response === "restocked-away") {
    return {
      kind: "text",
      phone: args.phone,
      text: "Tudo bem! Anotado. Quando quiser comprar conosco de novo, é só pedir.",
    };
  }
  return {
    kind: "text",
    phone: args.phone,
    text: "Pausei seus lembretes. ⚠️ Antes de interromper o tratamento, vale conversar com o farmacêutico responsável ou seu médico. Mande /voltar quando quiser reativar.",
  };
}

function firstName(full: string): string {
  return full.split(/\s+/)[0] ?? full;
}
