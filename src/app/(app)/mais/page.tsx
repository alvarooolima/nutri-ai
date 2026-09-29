import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { AREAS } from "../areas";
import { SairButton } from "./sair";

export const metadata: Metadata = { title: "Todas as áreas" };

export default function Mais() {
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader titulo="Todas as áreas" />
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {AREAS.map(({ href, nome, icon: Icon }) => (
          <li key={href}>
            <Link href={href} className="flex h-full flex-col gap-2 rounded-3xl border border-line bg-surface p-4 font-semibold hover:border-brand/40">
              <Icon className="text-brand" size={22} />
              <span className="text-sm">{nome}</span>
            </Link>
          </li>
        ))}
      </ul>
      <div className="mt-6">
        <SairButton />
      </div>
    </div>
  );
}
