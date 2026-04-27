export const metadata = { title: "Termos de Uso · Farma" };

export default function TermsPage() {
  return (
    <main className="min-h-screen px-6 py-12">
      <article className="mx-auto max-w-2xl prose prose-slate">
        <h1 className="text-2xl font-bold text-brand-800">Termos de Uso</h1>
        <p className="text-sm text-slate-500">Versão 1.0</p>
        <p>
          Estes termos regulam o uso da plataforma Farma por colaboradores convidados de farmácias
          parceiras. Ao aceitar o convite e criar sua conta, você concorda em:
        </p>
        <ul>
          <li>Utilizar a plataforma exclusivamente para finalidades de cuidado farmacêutico, registro de adesão a tratamento e farmacovigilância.</li>
          <li>Não compartilhar suas credenciais de acesso com terceiros.</li>
          <li>Tratar dados de pacientes com sigilo profissional, conforme a Lei 13.021/2014 e o Código de Ética Farmacêutico.</li>
          <li>Notificar imediatamente o farmacêutico responsável em caso de incidente de segurança.</li>
        </ul>
        <p>
          O administrador da farmácia pode revogar seu acesso a qualquer momento. Você pode
          solicitar a exclusão da sua conta enviando um pedido ao encarregado de dados.
        </p>
      </article>
    </main>
  );
}
