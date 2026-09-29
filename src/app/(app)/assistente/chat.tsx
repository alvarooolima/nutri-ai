"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { Button, cx } from "@/components/ui";
import type { AcaoSugerida } from "@/lib/server/assistente";

type Msg = { role: "user" | "assistant"; content: string; acoes?: AcaoSugerida[] };

const SUGESTOES = ["Não consegui almoçar", "Estou com muita fome", "Não tenho frango", "Quero fazer japonês", "Estou sem tempo", "Vou comer fora", "Tenho R$ 30 para o jantar de duas pessoas", "Não gostei dessa refeição"];

export function Chat({ inicial }: { inicial: Msg[] }) {
  const router = useRouter();
  const [msgs, setMsgs] = useState<Msg[]>(inicial);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [aplicadas, setAplicadas] = useState<Set<string>>(new Set());
  const fim = useRef<HTMLDivElement>(null);
  useEffect(() => {
    fim.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  async function enviar(m: string) {
    if (!m.trim() || enviando) return;
    setTexto("");
    setMsgs((x) => [...x, { role: "user", content: m }]);
    setEnviando(true);
    try {
      const r = await fetch("/api/assistente", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mensagem: m }) });
      const j = await r.json();
      setMsgs((x) => [...x, { role: "assistant", content: j.texto ?? j.erro ?? "Não consegui responder agora.", acoes: j.acoes }]);
    } catch {
      setMsgs((x) => [...x, { role: "assistant", content: "Sem conexão. Tente novamente." }]);
    } finally {
      setEnviando(false);
    }
  }

  async function aplicar(a: AcaoSugerida, chave: string) {
    if (a.tipo === "link") return;
    const r = await fetch("/api/assistente", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ acao: a }) });
    if (r.ok) {
      setAplicadas((s) => new Set(s).add(chave));
      setMsgs((x) => [...x, { role: "assistant", content: `Feito: ${a.rotulo}. Você pode ver ou desfazer em Meu plano.` }]);
      router.refresh();
    }
  }

  return (
    <div className="flex min-h-[60dvh] flex-col">
      <div className="flex-1 space-y-3">
        {msgs.length === 0 && (
          <div className="rounded-2xl border border-line bg-surface p-5 text-sm text-muted">
            Oi! Posso adaptar seu plano a imprevistos, sugerir trocas, opções por orçamento ou dicas para comer fora. Não substituo seu médico ou nutricionista.
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={cx("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            <div className={cx("max-w-[85%] whitespace-pre-line rounded-2xl px-4 py-3 text-[15px]", m.role === "user" ? "rounded-br-lg bg-brand text-white" : "rounded-bl-lg border border-line bg-surface")}>
              {m.content}
              {m.acoes && m.acoes.length > 0 && (
                <div className="mt-3 flex flex-col gap-2">
                  {m.acoes.map((a, k) => {
                    const chave = `${i}-${k}`;
                    return a.tipo === "link" ? (
                      <Link key={chave} href={a.href} className="rounded-2xl bg-brand-soft px-3 py-2 text-sm font-semibold text-brand-strong">{a.rotulo} →</Link>
                    ) : (
                      <button key={chave} disabled={aplicadas.has(chave)} onClick={() => aplicar(a, chave)} className="rounded-2xl bg-brand-soft px-3 py-2 text-left text-sm font-semibold text-brand-strong disabled:opacity-60">
                        {aplicadas.has(chave) ? "✓ " : ""}{a.rotulo}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ))}
        {enviando && <p className="text-sm text-muted">Pensando no seu caso…</p>}
        <div ref={fim} />
      </div>
      <div className="sticky bottom-20 mt-4 space-y-2 bg-bg pt-2 lg:bottom-0">
        <div className="-mx-4 flex gap-2 scroll-x px-4 pb-1">
          {SUGESTOES.map((s) => (
            <button key={s} onClick={() => enviar(s)} className="shrink-0 rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-medium hover:border-brand">
              {s}
            </button>
          ))}
        </div>
        <form onSubmit={(e) => { e.preventDefault(); enviar(texto); }} className="flex gap-2">
          <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Escreva aqui…" maxLength={1000} className="min-h-12 flex-1 rounded-2xl border border-line bg-surface px-4 text-[15px] focus:border-brand focus:outline-none" aria-label="Mensagem" />
          <Button type="submit" disabled={enviando || !texto.trim()} aria-label="Enviar">
            <Send size={18} />
          </Button>
        </form>
      </div>
    </div>
  );
}
