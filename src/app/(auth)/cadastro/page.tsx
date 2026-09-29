import type { Metadata } from "next";
import { CadastroForm } from "./form";

export const metadata: Metadata = { title: "Criar conta" };

export default function Cadastro() {
  return <CadastroForm />;
}
