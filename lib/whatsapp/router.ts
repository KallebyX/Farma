/**
 * Inbound message router. Parses an incoming WhatsApp message into a typed
 * intent. Pure module — no DB calls, easy to unit test.
 */

export type Intent =
  | { kind: "command"; command: SlashCommand }
  | { kind: "consent"; granted: boolean }
  | { kind: "reminder_response"; reminderId: string; action: ReminderAction; reason?: RefusalReason }
  | { kind: "ram_severity"; severity: "mild" | "moderate" | "severe" }
  | { kind: "ram_symptoms_freetext"; text: string }
  | { kind: "return_response"; expectationId: string; response: ReturnResponse }
  | { kind: "free_text"; text: string }
  | { kind: "unknown" };

export type ReturnResponse = "restocked-here" | "restocked-away" | "stopping";

export type SlashCommand =
  | "meusremedios"
  | "pausar"
  | "voltar"
  | "reacao"
  | "privacidade"
  | "sair"
  | "ajuda";

export type ReminderAction =
  | "taken"
  | "taken-late"
  | "defer"
  | "refuse"
  | "missed"
  | "reason";

export type RefusalReason = "no-stock" | "felt-bad" | "other";

const COMMAND_RE = /^\/(meusremedios|pausar|voltar|reacao|privacidade|sair|ajuda)\b/i;

export function parseInbound(args: { text?: string; buttonId?: string }): Intent {
  const buttonId = args.buttonId?.trim();
  const text = args.text?.trim() ?? "";

  if (buttonId) {
    return parseButton(buttonId);
  }

  // Slash commands first
  const m = COMMAND_RE.exec(text);
  if (m) return { kind: "command", command: m[1].toLowerCase() as SlashCommand };

  // Common natural-language fallbacks (lightweight; not ML)
  const low = text.toLowerCase();
  if (/^(sim|aceito|concordo|✅)/.test(low)) return { kind: "consent", granted: true };
  if (/^(não|nao|recuso|❌)/.test(low)) return { kind: "consent", granted: false };

  if (low.length > 0) return { kind: "free_text", text };
  return { kind: "unknown" };
}

function parseButton(id: string): Intent {
  if (id === "consent_yes") return { kind: "consent", granted: true };
  if (id === "consent_no") return { kind: "consent", granted: false };

  if (id.startsWith("r:")) {
    // r:<reminderId>:<action>[:<reason>]
    const parts = id.split(":");
    const reminderId = parts[1] ?? "";
    const action = (parts[2] ?? "") as ReminderAction;
    const reason = (parts[4] ?? parts[3]) as RefusalReason | undefined;
    if (!reminderId || !action) return { kind: "unknown" };
    if (action === "reason" && reason) {
      return { kind: "reminder_response", reminderId, action, reason };
    }
    return { kind: "reminder_response", reminderId, action };
  }

  if (id.startsWith("ram:severity:")) {
    const sev = id.split(":")[2] as "mild" | "moderate" | "severe";
    if (sev === "mild" || sev === "moderate" || sev === "severe") {
      return { kind: "ram_severity", severity: sev };
    }
  }

  if (id.startsWith("ret:")) {
    const parts = id.split(":");
    const expectationId = parts[1] ?? "";
    const response = parts[2] as ReturnResponse;
    if (
      expectationId &&
      (response === "restocked-here" || response === "restocked-away" || response === "stopping")
    ) {
      return { kind: "return_response", expectationId, response };
    }
  }

  return { kind: "unknown" };
}
