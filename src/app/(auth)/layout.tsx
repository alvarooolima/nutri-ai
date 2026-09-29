import Link from "next/link";
import { Logo } from "@/components/logo";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 py-8">
      <Link href="/" className="mb-8 flex items-center gap-2 text-lg font-extrabold tracking-tight text-brand">
        <Logo /> NUTRI.AI
      </Link>
      {children}
    </main>
  );
}
