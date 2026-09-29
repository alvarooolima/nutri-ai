import Link from "next/link";
import { Logo } from "@/components/logo";

export default function PublicLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <Link href="/" className="flex items-center gap-2 text-lg font-extrabold tracking-tight text-brand">
          <Logo /> NUTRI.AI
        </Link>
        <nav className="flex items-center gap-2 text-sm">
          <Link href="/login" className="rounded-xl px-3 py-2 font-semibold text-ink hover:bg-surface">Entrar</Link>
          <Link href="/cadastro" className="rounded-xl bg-brand px-3 py-2 font-semibold text-white hover:bg-brand-strong">Começar</Link>
        </nav>
      </header>
      {children}
      <footer className="mx-auto mt-16 max-w-5xl border-t border-line px-4 py-8 text-sm text-muted">
        <p>O NUTRI.AI é um assistente de planejamento alimentar. Não substitui médico ou nutricionista, não faz diagnósticos e não altera medicamentos.</p>
        <p className="mt-2 flex gap-4">
          <Link href="/privacidade" className="hover:text-ink">Privacidade</Link>
          <Link href="/termos" className="hover:text-ink">Termos</Link>
        </p>
      </footer>
    </div>
  );
}
