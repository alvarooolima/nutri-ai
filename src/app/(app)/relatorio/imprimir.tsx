"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui";

export function Imprimir() {
  return (
    <Button tamanho="sm" onClick={() => window.print()} className="no-print">
      <Printer size={16} /> Imprimir ou salvar PDF
    </Button>
  );
}
