import {
  AlertTriangle, BookOpen, CalendarDays, ChefHat, ClipboardList, HeartPulse, History, Home, LineChart, MessageCircle,
  RefreshCcw, Settings, ShoppingBasket, Soup, Stethoscope, User, UtensilsCrossed, type LucideIcon,
} from "lucide-react";

export interface Area {
  href: string;
  nome: string;
  descricao: string;
  icon: LucideIcon;
}

/** Áreas agrupadas por tarefa do usuário (proximidade/região comum; menos opções por grupo — Lei de Hick) */
export const GRUPOS: { titulo: string; areas: Area[] }[] = [
  {
    titulo: "Dia a dia",
    areas: [
      { href: "/inicio", nome: "Início", descricao: "Resumo do dia e próxima refeição", icon: Home },
      { href: "/plano", nome: "Meu plano", descricao: "Cardápio, trocas e ajustes do dia", icon: CalendarDays },
      { href: "/registrar", nome: "Registrar", descricao: "Refeições, peso, sono e energia", icon: ClipboardList },
      { href: "/sintomas", nome: "Sintomas", descricao: "Diário e padrões observados", icon: Stethoscope },
      { href: "/assistente", nome: "Assistente", descricao: "Ajuda para imprevistos", icon: MessageCircle },
    ],
  },
  {
    titulo: "Planejamento",
    areas: [
      { href: "/receitas", nome: "Receitas", descricao: "Modo de preparo, nutrientes e custo", icon: ChefHat },
      { href: "/compras", nome: "Compras", descricao: "Lista semanal por categoria", icon: ShoppingBasket },
      { href: "/preparo", nome: "Preparação semanal", descricao: "Cozinhar em lote e reaproveitar", icon: UtensilsCrossed },
      { href: "/desafio", nome: "Desafio japonês", descricao: "31 dias de alimentação japonesa", icon: Soup },
    ],
  },
  {
    titulo: "Acompanhamento",
    areas: [
      { href: "/evolucao", nome: "Evolução", descricao: "Gráficos além do peso", icon: LineChart },
      { href: "/revisao", nome: "Revisão e ajustes", descricao: "Balanço a cada 1–2 semanas", icon: RefreshCcw },
      { href: "/historico", nome: "Histórico de planos", descricao: "Versões e alterações", icon: History },
    ],
  },
  {
    titulo: "Saúde e transparência",
    areas: [
      { href: "/saude", nome: "Perfil Saúde", descricao: "Condições, medicamentos, alergias", icon: HeartPulse },
      { href: "/alertas", nome: "Segurança e alertas", descricao: "Pontos para avaliar com profissional", icon: AlertTriangle },
      { href: "/evidencias", nome: "Por que isso?", descricao: "Justificativas e fontes científicas", icon: BookOpen },
    ],
  },
  {
    titulo: "Conta",
    areas: [
      { href: "/perfil", nome: "Perfil e preferências", descricao: "Objetivo, rotina, gostos, orçamento", icon: User },
      { href: "/configuracoes", nome: "Configurações", descricao: "Privacidade, dados e conta", icon: Settings },
    ],
  },
];

export const AREAS: Area[] = GRUPOS.flatMap((g) => g.areas);
