import type { Metadata } from "next";

export const metadata: Metadata = { title: "Termos de Uso" };

export default function Termos() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-6 text-[15px] leading-relaxed">
      <h1 className="text-3xl font-bold tracking-tight">Termos de Uso</h1>
      <p className="mt-1 text-sm text-muted">Versão v1-2026-09</p>
      <div className="mt-6 space-y-5 [&_h2]:text-lg [&_h2]:font-bold">
        <section>
          <h2>1. O que é o NUTRI.AI</h2>
          <p>Um assistente de planejamento alimentar que gera estimativas e sugestões com base nas informações que você fornece e em referências científicas. As informações são educativas e de apoio.</p>
        </section>
        <section>
          <h2>2. O que o NUTRI.AI não faz</h2>
          <p>Não substitui consulta com médico ou nutricionista; não diagnostica doenças; não inicia, suspende ou altera medicamentos; não afirma que alimentação cura doenças. Diante de sintomas de alerta, procure atendimento de saúde.</p>
        </section>
        <section>
          <h2>3. Responsabilidade pelas informações</h2>
          <p>A qualidade das sugestões depende da veracidade e atualização dos dados informados. Valores nutricionais e custos são estimativas.</p>
        </section>
        <section>
          <h2>4. Idade mínima</h2>
          <p>Planos automáticos são destinados a maiores de 18 anos. Para menores, o sistema orienta acompanhamento profissional.</p>
        </section>
        <section>
          <h2>5. Conta</h2>
          <p>Você é responsável por manter sua senha em sigilo e pode excluir sua conta a qualquer momento em Configurações.</p>
        </section>
      </div>
    </main>
  );
}
