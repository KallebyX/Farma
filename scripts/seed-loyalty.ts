/**
 * Idempotent seed for the loyalty/affiliate catalog (missions, rewards,
 * partner pharmacies). Run: `pnpm tsx scripts/seed-loyalty.ts`
 */
import { PrismaClient, MissionKind, RewardKind } from "@prisma/client";

const prisma = new PrismaClient();

const PARTNERS = [
  { slug: "drogasil", name: "Drogasil", baseUrl: "https://www.drogasil.com.br", commissionPct: 6, pointsPerReal: 2, logo: "💊", color: "#0d9488" },
  { slug: "drogaria-sp", name: "Drogaria São Paulo", baseUrl: "https://www.drogariasaopaulo.com.br", commissionPct: 5, pointsPerReal: 1.5, logo: "🏥", color: "#3b82f6" },
  { slug: "pague-menos", name: "Pague Menos", baseUrl: "https://www.paguemenos.com.br", commissionPct: 7, pointsPerReal: 2.5, logo: "🏪", color: "#9333ea" },
  { slug: "panvel", name: "Panvel", baseUrl: "https://www.panvel.com", commissionPct: 5.5, pointsPerReal: 2, logo: "🏬", color: "#f59e0b" },
];

const MISSIONS = [
  { code: "complete_profile", title: "Complete seu perfil", description: "Preencha seus dados de saúde", points: 100, kind: MissionKind.PROFILE, icon: "📝", sortOrder: 1 },
  { code: "first_reminder", title: "Ative os lembretes", description: "Confirme o primeiro lembrete no WhatsApp", points: 150, kind: MissionKind.ADHERENCE, icon: "🔔", sortOrder: 2 },
  { code: "adherence_week", title: "7 dias de adesão", description: "Tome a medicação 7 dias seguidos", points: 300, kind: MissionKind.ADHERENCE, icon: "🔥", sortOrder: 3 },
  { code: "first_purchase", title: "Primeira compra", description: "Compre numa farmácia parceira pelo app", points: 200, kind: MissionKind.PURCHASE, icon: "🛒", sortOrder: 4 },
  { code: "refer_friend", title: "Indique um amigo", description: "Convide alguém para o Meu Prontuário", points: 250, kind: MissionKind.REFERRAL, icon: "🤝", sortOrder: 5 },
  { code: "daily_checkin", title: "Check-in diário", description: "Abra o hub e registre como está se sentindo", points: 20, kind: MissionKind.CHECKIN, icon: "📅", sortOrder: 6 },
];

const REWARDS = [
  { code: "discount10", title: "10% de desconto", description: "Cupom de 10% em farmácias parceiras", costPoints: 500, kind: RewardKind.DISCOUNT },
  { code: "freeship", title: "Frete grátis", description: "Entrega gratuita no próximo pedido", costPoints: 300, kind: RewardKind.DISCOUNT },
  { code: "cashback15", title: "R$ 15 de cashback", description: "Crédito de R$ 15 na próxima compra", costPoints: 1500, kind: RewardKind.CASHBACK },
  { code: "donation", title: "Doar 100 pts", description: "Converta pontos em doação a uma ONG de saúde", costPoints: 100, kind: RewardKind.DONATION },
];

async function main() {
  for (const p of PARTNERS) {
    await prisma.affiliatePartner.upsert({ where: { slug: p.slug }, update: p, create: p });
  }
  for (const m of MISSIONS) {
    await prisma.mission.upsert({ where: { code: m.code }, update: m, create: m });
  }
  for (const r of REWARDS) {
    await prisma.reward.upsert({ where: { code: r.code }, update: r, create: r });
  }
  console.log(`Seeded ${PARTNERS.length} partners, ${MISSIONS.length} missions, ${REWARDS.length} rewards.`);
}

main().then(() => prisma.$disconnect()).catch((e) => { console.error(e); prisma.$disconnect(); process.exit(1); });
