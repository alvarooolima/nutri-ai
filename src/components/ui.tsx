import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

export function Card({ className, children, ...rest }: ComponentProps<"div">) {
  return (
    <div className={cx("rounded-3xl border border-line bg-surface p-5 shadow-[0_1px_0_rgba(0,0,0,0.02)]", className)} {...rest}>
      {children}
    </div>
  );
}

type Variante = "primario" | "secundario" | "fantasma" | "perigo" | "suave";
const VAR: Record<Variante, string> = {
  primario: "bg-brand text-white hover:bg-brand-strong",
  secundario: "border border-line bg-surface text-ink hover:bg-surface-2",
  fantasma: "text-brand hover:bg-brand-soft",
  perigo: "bg-danger text-white hover:opacity-90",
  suave: "bg-brand-soft text-brand-strong hover:bg-[#d4e6da]",
};

export function btn(v: Variante = "primario", extra?: string) {
  return cx(
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
    VAR[v],
    extra,
  );
}

export function Button({ variante = "primario", className, ...rest }: ComponentProps<"button"> & { variante?: Variante }) {
  return <button className={btn(variante, className)} {...rest} />;
}

export function LinkButton({ variante = "primario", className, ...rest }: ComponentProps<typeof Link> & { variante?: Variante }) {
  return <Link className={btn(variante, className)} {...rest} />;
}

export function Badge({ tom = "neutro", children, className }: { tom?: "neutro" | "brand" | "accent" | "warn" | "danger" | "info"; children: ReactNode; className?: string }) {
  const t = {
    neutro: "bg-surface-2 text-muted border border-line",
    brand: "bg-brand-soft text-brand-strong",
    accent: "bg-accent-soft text-accent",
    warn: "bg-warn-soft text-warn",
    danger: "bg-danger-soft text-danger",
    info: "bg-info-soft text-info",
  }[tom];
  return <span className={cx("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold", t, className)}>{children}</span>;
}

export function PageHeader({ titulo, subtitulo, acao, voltar }: { titulo: string; subtitulo?: ReactNode; acao?: ReactNode; voltar?: string }) {
  return (
    <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        {voltar && (
          <Link href={voltar} className="mb-1 inline-block text-sm font-medium text-muted hover:text-ink">
            ← Voltar
          </Link>
        )}
        <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">{titulo}</h1>
        {subtitulo && <p className="mt-1 text-sm text-muted">{subtitulo}</p>}
      </div>
      {acao}
    </header>
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

export function AlertBox({ gravidade, titulo, children }: { gravidade: "info" | "atencao" | "importante"; titulo?: string; children: ReactNode }) {
  const s = {
    info: "border-info/20 bg-info-soft text-info",
    atencao: "border-warn/25 bg-warn-soft text-warn",
    importante: "border-danger/25 bg-danger-soft text-danger",
  }[gravidade];
  const rot = { info: "Para saber", atencao: "Atenção", importante: "Importante" }[gravidade];
  return (
    <div className={cx("rounded-2xl border px-4 py-3 text-sm", s)} role={gravidade === "importante" ? "alert" : "note"}>
      <p className="font-bold">{titulo ?? rot}</p>
      <div className="mt-0.5 text-ink/85">{children}</div>
    </div>
  );
}

export function Stat({ rotulo, valor, sub }: { rotulo: string; valor: ReactNode; sub?: ReactNode }) {
  return (
    <div className="rounded-2xl bg-surface-2 px-3 py-2.5">
      <p className="text-xs font-medium text-muted">{rotulo}</p>
      <p className="tabular text-lg font-bold text-ink">{valor}</p>
      {sub && <p className="text-xs text-muted">{sub}</p>}
    </div>
  );
}

export function Empty({ titulo, texto, acao }: { titulo: string; texto?: string; acao?: ReactNode }) {
  return (
    <Card className="flex flex-col items-center py-10 text-center">
      <p className="text-lg font-bold">{titulo}</p>
      {texto && <p className="mt-1 max-w-md text-sm text-muted">{texto}</p>}
      {acao && <div className="mt-4">{acao}</div>}
    </Card>
  );
}

export function Progress({ valor, max = 100, className }: { valor: number; max?: number; className?: string }) {
  const pct = Math.max(0, Math.min(100, (valor / max) * 100));
  return (
    <div className={cx("h-2 w-full overflow-hidden rounded-full bg-line", className)} role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${pct}%` }} />
    </div>
  );
}
