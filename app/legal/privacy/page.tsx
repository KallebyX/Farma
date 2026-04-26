export const metadata = { title: "Política de Privacidade · Farma" };

export default function PrivacyPage() {
  return (
    <main className="min-h-screen px-6 py-12">
      <article className="mx-auto max-w-2xl prose prose-slate">
        <h1 className="text-2xl font-bold text-brand-800">Política de Privacidade</h1>
        <p className="text-sm text-slate-500">Versão 1.0</p>
        <p>
          A plataforma Farma trata dados pessoais conforme a LGPD (Lei 13.709/2018). Esta política
          descreve quais dados são coletados, com qual finalidade e como você pode exercer seus
          direitos.
        </p>
        <h2>Dados coletados de colaboradores</h2>
        <ul>
          <li><strong>Identificação:</strong> nome, email, CRF (quando aplicável).</li>
          <li><strong>Operacionais:</strong> registros de login, ações realizadas no sistema, hora dos eventos.</li>
        </ul>
        <h2>Bases legais</h2>
        <p>
          Tratamos seus dados com base em: (i) execução de contrato com a farmácia em que você atua,
          (ii) cumprimento de obrigação legal e regulatória (Anvisa, CFF), e (iii) seu consentimento
          quando aplicável.
        </p>
        <h2>Direitos do titular</h2>
        <p>
          Você pode solicitar a qualquer momento: confirmação de tratamento, acesso, correção,
          anonimização, portabilidade ou eliminação dos seus dados pelo email do encarregado da
          farmácia ou da plataforma.
        </p>
        <h2>Encarregado de dados (DPO)</h2>
        <p>
          Para exercer seus direitos: <a href="mailto:dpo@farma.app">dpo@farma.app</a>.
        </p>
      </article>
    </main>
  );
}
