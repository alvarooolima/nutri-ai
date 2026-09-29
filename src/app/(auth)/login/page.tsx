import type { Metadata } from "next";
import { LoginForm } from "./form";

export const metadata: Metadata = { title: "Entrar" };

export default async function Login({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  return <LoginForm next={typeof sp.next === "string" ? sp.next : "/inicio"} aviso={typeof sp.aviso === "string" ? sp.aviso : undefined} />;
}
