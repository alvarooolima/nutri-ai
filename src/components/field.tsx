"use client";

import { isValidElement, type ComponentProps, type ReactNode } from "react";

function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

const campo = "w-full rounded-2xl border border-line bg-surface px-3.5 py-2.5 text-[15px] text-ink placeholder:text-muted/70 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20";

export function Input(props: ComponentProps<"input">) {
  return <input {...props} className={cx(campo, "min-h-11", props.className)} />;
}
export function Select(props: ComponentProps<"select">) {
  return <select {...props} className={cx(campo, "min-h-11 appearance-auto", props.className)} />;
}
export function Textarea(props: ComponentProps<"textarea">) {
  return <textarea {...props} className={cx(campo, "min-h-24", props.className)} />;
}


const CONTROLES: unknown[] = [Input, Select, Textarea];

/**
 * Rótulo + controle. Com um único campo, o <label> envolve o controle (associação acessível);
 * com grupos (chips, listas), usa um grupo rotulado para não desviar cliques e foco.
 */
export function Field({ label, dica, children, className }: { label: string; dica?: string; children: ReactNode; className?: string }) {
  const titulo = (
    <>
      {label}
      {dica && <span className="mt-0.5 block text-xs font-normal text-muted">{dica}</span>}
    </>
  );
  if (isValidElement(children) && CONTROLES.includes(children.type))
    return (
      <label className={cx("block", className)}>
        <span className="mb-1.5 block text-sm font-semibold text-ink">{titulo}</span>
        {children}
      </label>
    );
  return (
    <div role="group" aria-label={label} className={className}>
      <div className="mb-1.5 text-sm font-semibold text-ink">{titulo}</div>
      {children}
    </div>
  );
}
