import type { Metadata } from "next";

export const metadata: Metadata = { title: "Política de Privacidade" };

export default function Privacidade() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-6 text-[15px] leading-relaxed">
      <h1 className="text-3xl font-bold tracking-tight">Política de Privacidade</h1>
      <p className="mt-1 text-sm text-muted">Versão v1-2026-09 · Em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018).</p>
      <div className="mt-6 space-y-5 [&_h2]:text-lg [&_h2]:font-bold [&_ul]:list-disc [&_ul]:pl-5">
        <section>
          <h2>1. Quais dados tratamos</h2>
          <ul>
            <li>Cadastro: nome, e-mail, data de nascimento, sexo, altura e peso.</li>
            <li>Rotina, preferências alimentares, orçamento e objetivos.</li>
            <li><strong>Dados pessoais sensíveis de saúde</strong>: condições, cirurgias, internações, sintomas, alergias, medicamentos, suplementos, exames e orientações profissionais que você decidir informar.</li>
            <li>Registros de acompanhamento: refeições, sintomas, peso, medidas, sono, energia e adesão.</li>
          </ul>
        </section>
        <section>
          <h2>2. Para que usamos</h2>
          <p>Exclusivamente para calcular estimativas nutricionais, personalizar seu plano, gerar alertas de segurança e mostrar sua evolução. Não vendemos nem compartilhamos seus dados para publicidade.</p>
        </section>
        <section>
          <h2>3. Base legal</h2>
          <p>Dados de saúde são tratados com base no seu <strong>consentimento específico e destacado</strong> (art. 11, I, LGPD), registrado com data e versão no momento do cadastro. Demais dados são tratados para execução do serviço que você solicitou (art. 7º, V).</p>
        </section>
        <section>
          <h2>4. Segurança</h2>
          <ul>
            <li>Autenticação com senha e sessão segura; acesso aos dados restrito ao próprio titular por regras de segurança no banco (Row Level Security).</li>
            <li>Tráfego sempre criptografado (HTTPS/TLS) e banco de dados criptografado em repouso.</li>
            <li>Campos de saúde (condições, alergias, medicamentos, suplementos, observações) recebem uma camada adicional de criptografia na aplicação (AES-256-GCM).</li>
            <li>Registro de auditoria das ações relevantes (criação de planos, ajustes, exportação).</li>
          </ul>
        </section>
        <section>
          <h2>5. Operadores</h2>
          <p>Hospedagem da aplicação (Vercel) e banco de dados/autenticação (Supabase, região São Paulo). Se o assistente conversacional com IA estiver ativo, o texto da conversa e um resumo do seu perfil são enviados à Anthropic (Claude) apenas para gerar a resposta.</p>
        </section>
        <section>
          <h2>6. Seus direitos</h2>
          <p>Em <strong>Configurações</strong> você pode, a qualquer momento: acessar e corrigir dados, <strong>exportar todos os seus dados</strong> em formato JSON, revogar o consentimento de dados de saúde (os dados de saúde são apagados) e <strong>excluir sua conta</strong> — o que remove definitivamente todos os seus dados.</p>
        </section>
        <section>
          <h2>7. Retenção</h2>
          <p>Mantemos os dados enquanto a conta estiver ativa. Após a exclusão, os dados são removidos do banco imediatamente; cópias de segurança do provedor expiram conforme o ciclo de backup.</p>
        </section>
        <section>
          <h2>8. Limites do serviço</h2>
          <p>O NUTRI.AI não substitui médico ou nutricionista, não faz diagnóstico, não prescreve tratamento e não altera medicamentos.</p>
        </section>
      </div>
    </main>
  );
}
