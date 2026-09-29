import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { AlertTriangle, ChevronLeft, Info, ShieldAlert, type LucideIcon } from "lucide-react";

/*
 * Sistema de design do NUTRI.AI
 * - Escala tipográfica: 12 (legenda) · 13 (apoio) · 15 (corpo) · 17 (título de cartão) · 20 (seção) · 26/30 (página)
 * - Espaçamento em grade de 4/8 px: 8 dentro de grupos, 12–16 entre itens, 24 entre seções (proximidade)
 * - Raios: 12 controles pequenos · 16 controles · 24 cartões (região comum)
 * - Alvos de toque ≥ 44 px (Fitts); contraste de texto ≥ 4,5:1 (WCAG AA)
 */

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

export function Card({ className, children, ...rest }: ComponentProps<"div">) {
  return (
    <div className={cx("rounded-2xl border border-line bg-surface p-5", className)} {...rest}>
      {children}
    </div>
  );
}

type Variante = "primario" | "secundario" | "fantasma" | "perigo" | "suave";
type Tamanho = "sm" | "md" | "lg";
const VAR: Record<Variante, string> = {
  primario: "bg-brand text-white shadow-card hover:bg-brand-strong active:translate-y-px",
  secundario: "border border-line bg-surface text-ink hover:border-ink/20 hover:bg-surface-2",
  fantasma: "text-brand hover:bg-brand-soft",
  perigo: "bg-danger text-white hover:opacity-90",
  suave: "bg-brand-soft text-brand-strong hover:bg-[#d3e8e3]",
};
const TAM: Record<Tamanho, string> = {
  sm: "min-h-9 rounded-xl px-3 text-[13px]",
  md: "min-h-11 rounded-2xl px-4 text-sm",
  lg: "min-h-12 rounded-2xl px-5 text-[15px]",
};

export function btn(v: Variante = "primario", extra?: string, t: Tamanho = "md") {
  return cx(
    "inline-flex items-center justify-center gap-2 font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
    TAM[t],
    VAR[v],
    extra,
  );
}

export function Button({ variante = "primario", tamanho = "md", className, ...rest }: ComponentProps<"button"> & { variante?: Variante; tamanho?: Tamanho }) {
  return <button className={btn(variante, className, tamanho)} {...rest} />;
}

export function LinkButton({ variante = "primario", tamanho = "md", className, ...rest }: ComponentProps<typeof Link> & { variante?: Variante; tamanho?: Tamanho }) {
  return <Link className={btn(variante, className, tamanho)} {...rest} />;
}

/** Botão só com ícone: sempre com rótulo acessível e alvo de 40–44 px */
export function IconButton({ label, icon: Icon, className, ...rest }: ComponentProps<"button"> & { label: string; icon: LucideIcon }) {
  return (
    <button aria-label={label} title={label} className={cx("inline-flex size-10 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-surface-2 hover:text-ink", className)} {...rest}>
      <Icon size={18} />
    </button>
  );
}

export type Tom = "neutro" | "brand" | "accent" | "warn" | "danger" | "info";
const TOM: Record<Tom, string> = {
  neutro: "bg-surface-2 text-muted border border-line",
  brand: "bg-brand-soft text-brand-strong",
  accent: "bg-accent-soft text-accent",
  warn: "bg-warn-soft text-warn",
  danger: "bg-danger-soft text-danger",
  info: "bg-info-soft text-info",
};

export function Badge({ tom = "neutro", children, className }: { tom?: Tom; children: ReactNode; className?: string }) {
  return <span className={cx("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold", TOM[tom], className)}>{children}</span>;
}

/** Cabeçalho de página: sobretítulo (contexto) → título (foco) → subtítulo (apoio) */
export function PageHeader({ titulo, subtitulo, acao, voltar, sobre }: { titulo: string; subtitulo?: ReactNode; acao?: ReactNode; voltar?: string; sobre?: string }) {
  return (
    <header className="mb-6">
      {voltar && (
        <Link href={voltar} className="-ml-1 mb-2 inline-flex min-h-9 items-center gap-1 rounded-xl pr-2 text-sm font-medium text-muted hover:text-ink">
          <ChevronLeft size={18} /> Voltar
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          {sobre && <p className="mb-1 text-xs font-bold uppercase tracking-[0.08em] text-brand">{sobre}</p>}
          <h1 className="text-[26px] font-bold leading-tight tracking-tight text-ink sm:text-[30px]">{titulo}</h1>
          {subtitulo && <p className="mt-1.5 max-w-2xl text-[15px] leading-relaxed text-muted">{subtitulo}</p>}
        </div>
        {acao && <div className="shrink-0">{acao}</div>}
      </div>
    </header>
  );
}

/** Seção: agrupa conteúdo relacionado sob um título (proximidade + região comum) */
export function Section({ titulo, descricao, acao, children, className }: { titulo: string; descricao?: ReactNode; acao?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cx("space-y-3", className)}>
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-bold tracking-tight">{titulo}</h2>
          {descricao && <p className="text-[13px] text-muted">{descricao}</p>}
        </div>
        {acao}
      </div>
      {children}
    </section>
  );
}

export function Label({ children, htmlFor, dica }: { children: ReactNode; htmlFor?: string; dica?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-semibold text-ink">
      {children}
      {dica && <span className="mt-0.5 block text-xs font-normal text-muted">{dica}</span>}
    </label>
  );
}

export { Field, Input, Select, Textarea } from "./field";

const ALERTA = {
  info: { cls: "border-info/20 bg-info-soft", cor: "text-info", icon: Info, rot: "Para saber" },
  atencao: { cls: "border-warn/25 bg-warn-soft", cor: "text-warn", icon: AlertTriangle, rot: "Atenção" },
  importante: { cls: "border-danger/25 bg-danger-soft", cor: "text-danger", icon: ShieldAlert, rot: "Importante" },
} as const;

export function AlertBox({ gravidade, titulo, children, className }: { gravidade: "info" | "atencao" | "importante"; titulo?: string; children: ReactNode; className?: string }) {
  const a = ALERTA[gravidade];
  const Icon = a.icon;
  return (
    <div className={cx("flex gap-3 rounded-2xl border px-4 py-3 text-sm", a.cls, className)} role={gravidade === "importante" ? "alert" : "note"}>
      <Icon size={18} className={cx("mt-0.5 shrink-0", a.cor)} aria-hidden />
      <div className="min-w-0">
        <p className={cx("font-bold", a.cor)}>{titulo ?? a.rot}</p>
        <div className="mt-0.5 leading-relaxed text-ink/85">{children}</div>
      </div>
    </div>
  );
}

export function Stat({ rotulo, valor, sub }: { rotulo: string; valor: ReactNode; sub?: ReactNode }) {
  return (
    <div className="rounded-2xl bg-surface-2 px-3.5 py-3">
      <p className="text-xs font-medium text-muted">{rotulo}</p>
      <p className="tabular mt-0.5 text-lg font-bold leading-tight text-ink">{valor}</p>
      {sub && <p className="mt-0.5 text-xs text-muted">{sub}</p>}
    </div>
  );
}

/** Barra de meta: valor em relação à meta (fechamento/continuidade), com leitura textual */
export function MetaBar({ rotulo, valor, meta, unidade, minimo = false }: { rotulo: string; valor: number; meta: number; unidade: string; minimo?: boolean }) {
  const pct = meta > 0 ? (valor / meta) * 100 : 0;
  const ok = minimo ? pct >= 95 : pct >= 90 && pct <= 110;
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2 text-sm">
        <span className="font-semibold">{rotulo}</span>
        <span className="tabular text-muted">
          <strong className="font-bold text-ink">{Math.round(valor).toLocaleString("pt-BR")}</strong> / {minimo && "≥ "}
          {Math.round(meta).toLocaleString("pt-BR")} {unidade}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-line/70" role="progressbar" aria-label={rotulo} aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
        <div className={cx("h-full rounded-full transition-all", ok ? "bg-brand" : pct > 110 ? "bg-ink/45" : "bg-brand/55")} style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
    </div>
  );
}

export function Empty({ titulo, texto, acao, icon: Icon }: { titulo: string; texto?: string; acao?: ReactNode; icon?: LucideIcon }) {
  return (
    <Card className="flex flex-col items-center px-6 py-10 text-center">
      {Icon && (
        <span className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-brand-soft text-brand">
          <Icon size={22} />
        </span>
      )}
      <p className="text-lg font-bold">{titulo}</p>
      {texto && <p className="mt-1 max-w-md text-sm leading-relaxed text-muted">{texto}</p>}
      {acao && <div className="mt-5">{acao}</div>}
    </Card>
  );
}

export function Progress({ valor, max = 100, className, rotulo }: { valor: number; max?: number; className?: string; rotulo?: string }) {
  const pct = Math.max(0, Math.min(100, (valor / max) * 100));
  return (
    <div className={cx("h-2 w-full overflow-hidden rounded-full bg-line/70", className)} role="progressbar" aria-label={rotulo} aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${pct}%` }} />
    </div>
  );
}

/** Controle segmentado por links (troca de visão sem recarregar o contexto) */
export function Segmentos({ itens, ativo }: { itens: { id: string; rotulo: string; href: string }[]; ativo: string }) {
  return (
    <div className="inline-flex rounded-2xl border border-line bg-surface p-1 shadow-card" role="tablist">
      {itens.map((i) => (
        <Link
          key={i.id}
          href={i.href}
          scroll={false}
          role="tab"
          aria-selected={ativo === i.id}
          className={cx("min-h-9 rounded-xl px-3.5 py-2 text-sm font-semibold transition", ativo === i.id ? "bg-brand text-white" : "text-muted hover:text-ink")}
        >
          {i.rotulo}
        </Link>
      ))}
    </div>
  );
}
