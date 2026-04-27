import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

type InviteEmailProps = {
  inviteeName?: string;
  pharmacyName: string;
  roleLabel: string;
  inviterName: string;
  inviteUrl: string;
  expiresAt: Date;
};

const fmt = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

export default function InviteEmail({
  inviteeName,
  pharmacyName,
  roleLabel,
  inviterName,
  inviteUrl,
  expiresAt,
}: InviteEmailProps) {
  const greeting = inviteeName ? `Olá, ${inviteeName}!` : "Olá!";

  return (
    <Html>
      <Head />
      <Preview>
        {inviterName} convidou você para a equipe da {pharmacyName}
      </Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={brandSection}>
            <Text style={brandText}>FARMA · Adesão e Farmacovigilância</Text>
          </Section>

          <Heading as="h1" style={heading}>
            Você foi convidado para a {pharmacyName}
          </Heading>

          <Text style={paragraph}>{greeting}</Text>
          <Text style={paragraph}>
            <strong>{inviterName}</strong> convidou você para fazer parte da equipe da{" "}
            <strong>{pharmacyName}</strong> como <strong>{roleLabel}</strong> na plataforma Farma.
          </Text>

          <Section style={{ textAlign: "center", margin: "32px 0" }}>
            <Button href={inviteUrl} style={button}>
              Aceitar convite
            </Button>
          </Section>

          <Text style={small}>
            Ou copie e cole este link no seu navegador:
            <br />
            <span style={code}>{inviteUrl}</span>
          </Text>

          <Hr style={hr} />

          <Text style={muted}>
            Este convite expira em {fmt.format(expiresAt)}. Se você não esperava esse email, pode
            ignorá-lo com segurança.
          </Text>
          <Text style={muted}>
            Por que estou recebendo isso? Você foi convidado a colaborar na plataforma da{" "}
            {pharmacyName}. Seus dados serão tratados conforme a LGPD — você verá os termos antes
            de criar sua conta.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const body: React.CSSProperties = {
  backgroundColor: "#F5F9FC",
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  margin: 0,
  padding: "32px 16px",
};
const container: React.CSSProperties = {
  backgroundColor: "#FFFFFF",
  borderRadius: 12,
  margin: "0 auto",
  maxWidth: 560,
  padding: "32px",
};
const brandSection: React.CSSProperties = {
  borderBottom: "1px solid #E5EEF6",
  marginBottom: 24,
  paddingBottom: 16,
};
const brandText: React.CSSProperties = {
  color: "#3B82C4",
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: 1.5,
  margin: 0,
  textTransform: "uppercase",
};
const heading: React.CSSProperties = {
  color: "#1E4A7A",
  fontSize: 24,
  fontWeight: 700,
  lineHeight: 1.3,
  margin: "0 0 16px",
};
const paragraph: React.CSSProperties = {
  color: "#1E293B",
  fontSize: 15,
  lineHeight: 1.6,
  margin: "0 0 12px",
};
const button: React.CSSProperties = {
  backgroundColor: "#3B82C4",
  borderRadius: 8,
  color: "#FFFFFF",
  fontSize: 15,
  fontWeight: 600,
  padding: "14px 28px",
  textDecoration: "none",
};
const small: React.CSSProperties = {
  color: "#475569",
  fontSize: 13,
  lineHeight: 1.5,
  textAlign: "center" as const,
};
const code: React.CSSProperties = {
  backgroundColor: "#F1F5F9",
  borderRadius: 4,
  color: "#1E4A7A",
  display: "inline-block",
  fontFamily: "ui-monospace, SFMono-Regular, monospace",
  fontSize: 12,
  marginTop: 8,
  padding: "6px 10px",
  wordBreak: "break-all" as const,
};
const hr: React.CSSProperties = {
  borderColor: "#E5EEF6",
  margin: "32px 0 24px",
};
const muted: React.CSSProperties = {
  color: "#64748B",
  fontSize: 12,
  lineHeight: 1.6,
  margin: "0 0 8px",
};
