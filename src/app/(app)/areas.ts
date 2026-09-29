import {
  AlertTriangle, BookOpen, CalendarDays, ChefHat, ClipboardList, HeartPulse, History, Home, LineChart, MessageCircle,
  RefreshCcw, Settings, ShoppingBasket, Soup, Stethoscope, User, UtensilsCrossed,
} from "lucide-react";

export const AREAS = [
  { href: "/inicio", nome: "Início", icon: Home },
  { href: "/plano", nome: "Meu plano", icon: CalendarDays },
  { href: "/registrar", nome: "Registrar", icon: ClipboardList },
  { href: "/sintomas", nome: "Sintomas", icon: Stethoscope },
  { href: "/evolucao", nome: "Evolução", icon: LineChart },
  { href: "/receitas", nome: "Receitas", icon: ChefHat },
  { href: "/compras", nome: "Compras", icon: ShoppingBasket },
  { href: "/preparo", nome: "Preparação semanal", icon: UtensilsCrossed },
  { href: "/desafio", nome: "Desafio japonês", icon: Soup },
  { href: "/assistente", nome: "Assistente", icon: MessageCircle },
  { href: "/revisao", nome: "Revisão e ajustes", icon: RefreshCcw },
  { href: "/evidencias", nome: "Por que isso?", icon: BookOpen },
  { href: "/saude", nome: "Perfil Saúde", icon: HeartPulse },
  { href: "/alertas", nome: "Segurança e alertas", icon: AlertTriangle },
  { href: "/historico", nome: "Histórico de planos", icon: History },
  { href: "/perfil", nome: "Perfil e preferências", icon: User },
  { href: "/configuracoes", nome: "Configurações", icon: Settings },
] as const;
