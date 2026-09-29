"use client";

import { Plus, Trash2 } from "lucide-react";
import { useMemo, useState, useTransition, type ReactNode } from "react";
import { FOODS } from "@/data/foods";
import { MODOS } from "@/lib/nutrition/planner";
import { CONDICOES, SINTOMAS_ALERTA, SINTOMAS_COMUNS } from "@/lib/nutrition/safety";
import { salvarEtapa } from "@/lib/server/actions-perfil";
import type { PerfilCompleto } from "@/lib/server/perfil";
import { AlertBox, Button, cx, Field, Input, Select, Textarea } from "@/components/ui";

export function Chips<T extends string>({ opcoes, valor, onChange, multiplo = true }: { opcoes: { id: T; nome: string }[]; valor: T[]; onChange: (v: T[]) => void; multiplo?: boolean }) {
  return (
    <div className="flex flex-wrap gap-2">
      {opcoes.map((o) => {
        const ativo = valor.includes(o.id);
        return (
          <button
            key={o.id}
            type="button"
            aria-pressed={ativo}
            onClick={() => onChange(multiplo ? (ativo ? valor.filter((v) => v !== o.id) : [...valor, o.id]) : [o.id])}
            className={cx(
              "min-h-10 rounded-full border px-3.5 py-1.5 text-sm font-medium transition",
              ativo ? "border-brand bg-brand text-white" : "border-line bg-surface text-ink hover:border-brand/40",
            )}
          >
            {o.nome}
          </button>
        );
      })}
    </div>
  );
}

function Escala({ valor, onChange, rotulos }: { valor: number | null; onChange: (v: number) => void; rotulos: [string, string] }) {
  return (
    <div>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" aria-pressed={valor === n} onClick={() => onChange(n)} className={cx("size-11 rounded-2xl border text-sm font-bold", valor === n ? "border-brand bg-brand text-white" : "border-line bg-surface")}>
            {n}
          </button>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-xs text-muted" style={{ maxWidth: 260 }}>
        <span>{rotulos[0]}</span>
        <span>{rotulos[1]}</span>
      </div>
    </div>
  );
}

function Rodape({ salvar, pendente, erro, rotulo = "Salvar e continuar", voltar }: { salvar: () => void; pendente: boolean; erro: string | null; rotulo?: string; voltar?: () => void }) {
  return (
    <div className="mt-6 space-y-3">
      {erro && <AlertBox gravidade="importante" titulo="Não foi possível salvar">{erro}</AlertBox>}
      <div className="flex gap-3">
        {voltar && (
          <Button type="button" variante="secundario" onClick={voltar}>
            Voltar
          </Button>
        )}
        <Button type="button" onClick={salvar} disabled={pendente} className="flex-1">
          {pendente ? "Salvando…" : rotulo}
        </Button>
      </div>
    </div>
  );
}

function useSalvar(etapa: number, onSalvo: () => void) {
  const [pendente, start] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const salvar = (dados: unknown) =>
    start(async () => {
      setErro(null);
      const r = await salvarEtapa(etapa, dados);
      if (r.ok) onSalvo();
      else setErro(r.erro);
    });
  return { pendente, erro, salvar };
}

interface StepProps {
  p: PerfilCompleto;
  onSalvo: () => void;
  voltar?: () => void;
  rotulo?: string;
}

const Grid = ({ children }: { children: ReactNode }) => <div className="grid gap-4 sm:grid-cols-2">{children}</div>;

// ------------------------------------------------------------------ 0 Perfil
export function StepPerfil({ p, onSalvo, voltar, rotulo }: StepProps) {
  const [v, setV] = useState({
    nome: p.nome,
    data_nascimento: p.dataNascimento ?? "",
    sexo: p.sexo ?? "",
    altura: p.altura?.toString() ?? "",
    peso: p.peso?.toString() ?? "",
    cintura: p.habitos.cintura?.toString() ?? "",
    quadril: p.habitos.quadril?.toString() ?? "",
  });
  const s = useSalvar(0, onSalvo);
  const set = (k: keyof typeof v) => (e: { target: { value: string } }) => setV({ ...v, [k]: e.target.value });
  return (
    <div className="space-y-4">
      <Field label="Nome">
        <Input value={v.nome} onChange={set("nome")} />
      </Field>
      <Grid>
        <Field label="Data de nascimento">
          <Input type="date" value={v.data_nascimento} onChange={set("data_nascimento")} max={new Date().toISOString().slice(0, 10)} />
        </Field>
        <Field label="Sexo" dica="Usado nas equações de gasto energético.">
          <Select value={v.sexo} onChange={set("sexo")}>
            <option value="">Selecione</option>
            <option value="feminino">Feminino</option>
            <option value="masculino">Masculino</option>
            <option value="outro">Outro / prefiro não informar</option>
          </Select>
        </Field>
        <Field label="Altura (cm)">
          <Input inputMode="decimal" value={v.altura} onChange={set("altura")} placeholder="ex.: 168" />
        </Field>
        <Field label="Peso atual (kg)">
          <Input inputMode="decimal" value={v.peso} onChange={set("peso")} placeholder="ex.: 72,5" />
        </Field>
        <Field label="Cintura (cm) — opcional">
          <Input inputMode="decimal" value={v.cintura} onChange={set("cintura")} />
        </Field>
        <Field label="Quadril (cm) — opcional">
          <Input inputMode="decimal" value={v.quadril} onChange={set("quadril")} />
        </Field>
      </Grid>
      <Rodape {...s} voltar={voltar} rotulo={rotulo} salvar={() => s.salvar({ ...v, altura: v.altura.replace(",", "."), peso: v.peso.replace(",", "."), cintura: v.cintura.replace(",", "."), quadril: v.quadril.replace(",", ".") })} />
    </div>
  );
}

// ------------------------------------------------------------------ 1 Objetivo
export const OBJETIVOS = [
  { id: "perda_peso", nome: "Perder peso" },
  { id: "manutencao", nome: "Manter o peso" },
  { id: "ganho_massa", nome: "Ganhar massa muscular" },
  { id: "saude_geral", nome: "Cuidar da saúde" },
  { id: "performance", nome: "Melhorar desempenho esportivo" },
  { id: "melhorar_alimentacao", nome: "Comer melhor / mais organizado" },
] as const;

const SECUNDARIOS = ["Mais energia", "Dormir melhor", "Menos ultraprocessados", "Economizar", "Aprender a cozinhar", "Melhorar digestão", "Comer mais vegetais", "Reduzir doces", "Praticidade"].map((x) => ({ id: x, nome: x }));

export function StepObjetivo({ p, onSalvo, voltar, rotulo }: StepProps) {
  const [v, setV] = useState({
    objetivo_principal: p.objetivo.principal ?? "",
    objetivos_secundarios: p.objetivo.secundarios,
    meta_peso: p.objetivo.metaPeso?.toString() ?? "",
    prazo: p.objetivo.prazo ?? "",
    motivacao: p.objetivo.motivacao ?? "",
  });
  const s = useSalvar(1, onSalvo);
  return (
    <div className="space-y-5">
      <Field label="Qual é o seu objetivo principal?">
        <Chips opcoes={OBJETIVOS.map((o) => ({ id: o.id as string, nome: o.nome }))} valor={v.objetivo_principal ? [v.objetivo_principal] : []} onChange={(x) => setV({ ...v, objetivo_principal: x[0] as typeof v.objetivo_principal })} multiplo={false} />
      </Field>
      <Field label="Objetivos secundários" dica="Opcional — escolha quantos quiser.">
        <Chips opcoes={SECUNDARIOS} valor={v.objetivos_secundarios} onChange={(x) => setV({ ...v, objetivos_secundarios: x })} />
      </Field>
      {(v.objetivo_principal === "perda_peso" || v.objetivo_principal === "ganho_massa") && (
        <Grid>
          <Field label="Meta de peso (kg) — opcional">
            <Input inputMode="decimal" value={v.meta_peso} onChange={(e) => setV({ ...v, meta_peso: e.target.value })} />
          </Field>
          <Field label="Prazo desejado — opcional">
            <Input type="date" value={v.prazo} onChange={(e) => setV({ ...v, prazo: e.target.value })} />
          </Field>
        </Grid>
      )}
      <Field label="O que te motiva?" dica="Ajuda o assistente a conversar com você. Opcional.">
        <Textarea value={v.motivacao} onChange={(e) => setV({ ...v, motivacao: e.target.value })} placeholder="ex.: ter mais disposição para brincar com meus filhos" />
      </Field>
      <Rodape {...s} voltar={voltar} rotulo={rotulo} salvar={() => s.salvar({ ...v, meta_peso: v.meta_peso.replace(",", ".") })} />
    </div>
  );
}

// ------------------------------------------------------------------ 2 Rotina
const NIVEIS = [
  { id: "sedentario", nome: "Sedentário", d: "Trabalho sentado, pouco deslocamento a pé" },
  { id: "leve", nome: "Leve", d: "Caminho um pouco, fico parte do dia em pé" },
  { id: "moderado", nome: "Moderado", d: "Em pé boa parte do dia ou deslocamento ativo" },
  { id: "ativo", nome: "Ativo", d: "Trabalho físico ou muito movimento" },
  { id: "muito_ativo", nome: "Muito ativo", d: "Trabalho braçal pesado" },
] as const;

export function StepRotina({ p, onSalvo, voltar, rotulo }: StepProps) {
  const r = p.rotina;
  const [v, setV] = useState({
    horario_acordar: r.acordar ?? "",
    horario_dormir: r.dormir ?? "",
    horas_de_sono: r.horasSono?.toString() ?? "",
    trabalho: r.trabalho ?? "",
    deslocamento: r.deslocamento ?? "",
    horarios_disponiveis: r.horarios,
    tempo_cozinhar_min: r.tempoCozinhar?.toString() ?? "",
    refeicoes_fora: r.refeicoesFora ?? "",
    nivel_atividade: r.nivelAtividade ?? "",
    passos_diarios: r.passos?.toString() ?? "",
  });
  const s = useSalvar(2, onSalvo);
  const set = (k: keyof typeof v) => (e: { target: { value: string } }) => setV({ ...v, [k]: e.target.value });
  const HOR = ["Manhã cedo", "Meio da manhã", "Almoço", "Meio da tarde", "Início da noite", "Noite"].map((x) => ({ id: x, nome: x }));
  return (
    <div className="space-y-4">
      <Grid>
        <Field label="Costumo acordar às">
          <Input type="time" value={v.horario_acordar} onChange={set("horario_acordar")} />
        </Field>
        <Field label="Costumo dormir às">
          <Input type="time" value={v.horario_dormir} onChange={set("horario_dormir")} />
        </Field>
        <Field label="Horas de sono por noite">
          <Input inputMode="decimal" value={v.horas_de_sono} onChange={set("horas_de_sono")} />
        </Field>
        <Field label="Trabalho">
          <Select value={v.trabalho} onChange={set("trabalho")}>
            <option value="">Selecione</option>
            {["Presencial", "Remoto", "Híbrido", "Turnos / plantão", "Não trabalho fora", "Estudo"].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </Select>
        </Field>
        <Field label="Deslocamento diário">
          <Select value={v.deslocamento} onChange={set("deslocamento")}>
            <option value="">Selecione</option>
            {["Não me desloco", "Carro/moto", "Transporte público", "A pé ou bicicleta", "Longo (mais de 1 h por dia)"].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </Select>
        </Field>
        <Field label="Tempo para cozinhar por dia">
          <Select value={v.tempo_cozinhar_min} onChange={set("tempo_cozinhar_min")}>
            <option value="">Selecione</option>
            <option value="10">Quase nenhum (até 10 min)</option>
            <option value="20">Até 20 min</option>
            <option value="40">Até 40 min</option>
            <option value="90">Mais de 40 min / gosto de cozinhar</option>
          </Select>
        </Field>
        <Field label="Refeições fora de casa">
          <Select value={v.refeicoes_fora} onChange={set("refeicoes_fora")}>
            <option value="">Selecione</option>
            {["Raramente", "1–3 vezes por semana", "4–7 vezes por semana", "Quase todas as refeições"].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </Select>
        </Field>
        <Field label="Passos por dia (se souber)">
          <Input inputMode="numeric" value={v.passos_diarios} onChange={set("passos_diarios")} />
        </Field>
      </Grid>
      <Field label="Horários em que consigo comer">
        <Chips opcoes={HOR} valor={v.horarios_disponiveis} onChange={(x) => setV({ ...v, horarios_disponiveis: x })} />
      </Field>
      <Field label="Nível de atividade no dia a dia" dica="Sem contar treinos — eles entram na etapa de exercícios.">
        <div className="grid gap-2">
          {NIVEIS.map((n) => (
            <button key={n.id} type="button" aria-pressed={v.nivel_atividade === n.id} onClick={() => setV({ ...v, nivel_atividade: n.id })} className={cx("rounded-2xl border px-4 py-3 text-left", v.nivel_atividade === n.id ? "border-brand bg-brand-soft" : "border-line bg-surface")}>
              <span className="font-semibold">{n.nome}</span>
              <span className="block text-sm text-muted">{n.d}</span>
            </button>
          ))}
        </div>
      </Field>
      <Rodape {...s} voltar={voltar} rotulo={rotulo} salvar={() => s.salvar({ ...v, horas_de_sono: v.horas_de_sono.replace(",", ".") })} />
    </div>
  );
}

// ------------------------------------------------------------------ 3 Alimentação
export const REFEICOES_OPC = [
  { id: "cafe", nome: "Café da manhã" },
  { id: "lanche_manha", nome: "Lanche da manhã" },
  { id: "almoco", nome: "Almoço" },
  { id: "lanche", nome: "Lanche da tarde" },
  { id: "jantar", nome: "Jantar" },
  { id: "ceia", nome: "Ceia" },
] as const;

export function StepAlimentacao({ p, onSalvo, voltar, rotulo }: StepProps) {
  const h = p.habitos;
  const [v, setV] = useState({
    refeicoes_preferidas: p.alimentacao.refeicoes as string[],
    fome: h.fome ?? null,
    fomeHorario: h.fomeHorario ?? "",
    doces: h.doces ?? "",
    bebidas: h.bebidas ?? "",
    cafe: h.cafe?.toString() ?? "",
    alcoolDoses: h.alcoolDoses?.toString() ?? "",
    ultraprocessados: h.ultraprocessados ?? "",
    agua: h.agua ?? "",
    diaAlimentar: h.diaAlimentar ?? "",
  });
  const s = useSalvar(3, onSalvo);
  const set = (k: keyof typeof v) => (e: { target: { value: string } }) => setV({ ...v, [k]: e.target.value });
  const FREQ = ["Nunca", "Raramente", "Algumas vezes por semana", "Todos os dias", "Várias vezes ao dia"];
  return (
    <div className="space-y-5">
      <Field label="Quais refeições você faz ou gostaria de fazer?" dica="Não é obrigatório tomar café da manhã ou fazer lanches — o plano segue a sua rotina.">
        <Chips opcoes={REFEICOES_OPC.map((r) => ({ id: r.id as string, nome: r.nome }))} valor={v.refeicoes_preferidas} onChange={(x) => setV({ ...v, refeicoes_preferidas: x })} />
      </Field>
      <Field label="Como costuma ser sua fome?">
        <Escala valor={v.fome} onChange={(n) => setV({ ...v, fome: n })} rotulos={["Pouca fome", "Muita fome"]} />
      </Field>
      <Grid>
        <Field label="Em que horário a fome é maior?">
          <Input value={v.fomeHorario} onChange={set("fomeHorario")} placeholder="ex.: fim da tarde" />
        </Field>
        <Field label="Doces">
          <Select value={v.doces} onChange={set("doces")}>
            <option value="">Selecione</option>
            {FREQ.map((x) => <option key={x}>{x}</option>)}
          </Select>
        </Field>
        <Field label="Ultraprocessados (salgadinhos, biscoitos, congelados prontos…)">
          <Select value={v.ultraprocessados} onChange={set("ultraprocessados")}>
            <option value="">Selecione</option>
            {FREQ.map((x) => <option key={x}>{x}</option>)}
          </Select>
        </Field>
        <Field label="Bebidas açucaradas (refrigerante, suco de caixinha)">
          <Select value={v.bebidas} onChange={set("bebidas")}>
            <option value="">Selecione</option>
            {FREQ.map((x) => <option key={x}>{x}</option>)}
          </Select>
        </Field>
        <Field label="Xícaras de café por dia">
          <Input inputMode="numeric" value={v.cafe} onChange={set("cafe")} />
        </Field>
        <Field label="Doses de álcool por semana" dica="1 dose ≈ 1 lata de cerveja, 1 taça de vinho ou 1 dose de destilado.">
          <Input inputMode="numeric" value={v.alcoolDoses} onChange={set("alcoolDoses")} />
        </Field>
        <Field label="Água por dia">
          <Select value={v.agua} onChange={set("agua")}>
            <option value="">Selecione</option>
            {["Menos de 1 litro", "1 a 1,5 litro", "1,5 a 2 litros", "Mais de 2 litros", "Não sei"].map((x) => <option key={x}>{x}</option>)}
          </Select>
        </Field>
      </Grid>
      <Field label="Descreva um dia alimentar comum" dica="Do acordar ao dormir, do jeito que vier. Isso ajuda a manter o que já funciona.">
        <Textarea value={v.diaAlimentar} onChange={set("diaAlimentar")} rows={4} placeholder="ex.: café com pão e manteiga às 7h; almoço no restaurante por quilo; lanche de biscoito às 16h…" />
      </Field>
      <Rodape {...s} voltar={voltar} rotulo={rotulo} salvar={() => s.salvar(v)} />
    </div>
  );
}

// ------------------------------------------------------------------ 4 Saúde
const ALERGENOS = [
  { id: "gluten", nome: "Glúten" },
  { id: "leite", nome: "Leite (proteína)" },
  { id: "lactose", nome: "Lactose" },
  { id: "ovo", nome: "Ovo" },
  { id: "peixe", nome: "Peixe" },
  { id: "frutos_do_mar", nome: "Frutos do mar" },
  { id: "soja", nome: "Soja" },
  { id: "amendoim", nome: "Amendoim" },
  { id: "castanhas", nome: "Castanhas" },
  { id: "gergelim", nome: "Gergelim" },
] as const;

type Med = { nome: string; dose: string; frequencia: string; horario?: string };

function ListaItens({ itens, onChange, rotulo, comHorario }: { itens: Med[]; onChange: (x: Med[]) => void; rotulo: string; comHorario?: boolean }) {
  return (
    <div className="space-y-2">
      {itens.map((m, i) => (
        <div key={i} className="grid grid-cols-2 gap-2 rounded-2xl bg-surface-2 p-3 sm:grid-cols-[2fr_1fr_1fr_1fr_auto]">
          <Input aria-label="Nome" placeholder="Nome" value={m.nome} onChange={(e) => onChange(itens.map((x, k) => (k === i ? { ...x, nome: e.target.value } : x)))} className="col-span-2 sm:col-span-1" />
          <Input aria-label="Dose" placeholder="Dose" value={m.dose} onChange={(e) => onChange(itens.map((x, k) => (k === i ? { ...x, dose: e.target.value } : x)))} />
          <Input aria-label="Frequência" placeholder="Frequência" value={m.frequencia} onChange={(e) => onChange(itens.map((x, k) => (k === i ? { ...x, frequencia: e.target.value } : x)))} />
          {comHorario && <Input aria-label="Horário" placeholder="Horário" value={m.horario ?? ""} onChange={(e) => onChange(itens.map((x, k) => (k === i ? { ...x, horario: e.target.value } : x)))} />}
          <button type="button" onClick={() => onChange(itens.filter((_, k) => k !== i))} className="flex min-h-11 items-center justify-center rounded-xl text-muted hover:bg-danger-soft hover:text-danger" aria-label="Remover">
            <Trash2 size={18} />
          </button>
        </div>
      ))}
      <Button type="button" variante="suave" onClick={() => onChange([...itens, { nome: "", dose: "", frequencia: "", horario: "" }])}>
        <Plus size={16} /> {rotulo}
      </Button>
    </div>
  );
}

export function StepSaude({ p, onSalvo, voltar, rotulo }: StepProps) {
  const sd = p.saude;
  const [v, setV] = useState({
    condicoes: sd.condicoes,
    condicoesTexto: sd.condicoesTexto ?? "",
    sintomas: sd.sintomas,
    cirurgias: sd.cirurgias ?? "",
    internacoes: sd.internacoes ?? "",
    exames: sd.exames ?? "",
    orientacoes: sd.orientacoes ?? "",
    alergias: sd.alergias as string[],
    intolerancias: sd.intolerancias as string[],
    anafilaxia: sd.anafilaxia ?? false,
    alergiasTexto: sd.alergiasTexto ?? "",
    medicamentos: p.medicamentos.map((m) => ({ nome: m.nome, dose: m.dose ?? "", frequencia: m.frequencia ?? "", horario: m.horario ?? "" })),
    suplementos: p.suplementos.map((m) => ({ nome: m.nome, dose: m.dose ?? "", frequencia: m.frequencia ?? "" })),
  });
  const s = useSalvar(4, onSalvo);
  const set = (k: keyof typeof v) => (e: { target: { value: string } }) => setV({ ...v, [k]: e.target.value });
  const sintomasOpc = [...SINTOMAS_ALERTA, ...SINTOMAS_COMUNS.map((x) => ({ id: x, nome: x }))];
  return (
    <div className="space-y-5">
      <AlertBox gravidade="info" titulo="Seu Perfil Saúde é separado da dieta">
        Usamos estas informações como <strong>contexto de segurança</strong> — para evitar riscos e sinalizar o que deve ser validado com profissional — e não para criar uma “dieta para a doença”. Tudo aqui é criptografado e opcional.
      </AlertBox>
      <Field label="Condições de saúde (diagnosticadas)">
        <Chips opcoes={CONDICOES} valor={v.condicoes} onChange={(x) => setV({ ...v, condicoes: x })} />
      </Field>
      <Field label="Outras condições ou detalhes">
        <Textarea value={v.condicoesTexto} onChange={set("condicoesTexto")} rows={2} />
      </Field>
      <Field label="Sintomas atuais">
        <Chips opcoes={sintomasOpc} valor={v.sintomas} onChange={(x) => setV({ ...v, sintomas: x })} />
      </Field>
      <Field label="Alergias alimentares">
        <Chips opcoes={ALERGENOS.map((a) => ({ id: a.id as string, nome: a.nome }))} valor={v.alergias} onChange={(x) => setV({ ...v, alergias: x })} />
      </Field>
      <label className="-mt-2 flex items-center gap-2 text-sm">
        <input type="checkbox" checked={v.anafilaxia} onChange={(e) => setV({ ...v, anafilaxia: e.target.checked })} className="size-4 accent-[var(--brand)]" />
        Já tive reação alérgica grave (anafilaxia)
      </label>
      <Field label="Intolerâncias">
        <Chips opcoes={ALERGENOS.map((a) => ({ id: a.id as string, nome: a.nome }))} valor={v.intolerancias} onChange={(x) => setV({ ...v, intolerancias: x })} />
      </Field>
      <Field label="Outras alergias ou observações">
        <Input value={v.alergiasTexto} onChange={set("alergiasTexto")} />
      </Field>
      <Field label="Medicamentos em uso" dica="O NUTRI.AI nunca sugere iniciar, suspender ou alterar medicamentos.">
        <ListaItens itens={v.medicamentos} onChange={(x) => setV({ ...v, medicamentos: x.map((m) => ({ ...m, horario: m.horario ?? "" })) })} rotulo="Adicionar medicamento" comHorario />
      </Field>
      <Field label="Suplementos">
        <ListaItens itens={v.suplementos} onChange={(x) => setV({ ...v, suplementos: x })} rotulo="Adicionar suplemento" />
      </Field>
      <Grid>
        <Field label="Cirurgias">
          <Textarea value={v.cirurgias} onChange={set("cirurgias")} rows={2} />
        </Field>
        <Field label="Internações">
          <Textarea value={v.internacoes} onChange={set("internacoes")} rows={2} />
        </Field>
        <Field label="Exames relevantes" dica="ex.: glicemia, colesterol, ferritina — com data, se souber.">
          <Textarea value={v.exames} onChange={set("exames")} rows={2} />
        </Field>
        <Field label="Orientações de profissionais de saúde">
          <Textarea value={v.orientacoes} onChange={set("orientacoes")} rows={2} />
        </Field>
      </Grid>
      <Rodape {...s} voltar={voltar} rotulo={rotulo} salvar={() => s.salvar({ ...v, medicamentos: v.medicamentos.filter((m) => m.nome.trim()), suplementos: v.suplementos.filter((m) => m.nome.trim()) })} />
    </div>
  );
}

// ------------------------------------------------------------------ 5 Exercícios
type Ex = { tipo: string; frequencia: string; duracao: string; intensidade: "leve" | "moderada" | "intensa"; horario: string; objetivo: string };

export function StepExercicios({ p, onSalvo, voltar, rotulo }: StepProps) {
  const [lista, setLista] = useState<Ex[]>(
    p.exercicios.map((e) => ({ tipo: e.tipo, frequencia: String(e.frequencia), duracao: String(e.duracao), intensidade: e.intensidade, horario: e.horario ?? "", objetivo: e.objetivo ?? "" })),
  );
  const s = useSalvar(5, onSalvo);
  const upd = (i: number, k: keyof Ex, val: string) => setLista(lista.map((x, j) => (j === i ? { ...x, [k]: val } : x)));
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">Adicione atividades físicas planejadas (musculação, corrida, futebol, dança…). Se não pratica, é só continuar.</p>
      {lista.map((e, i) => (
        <div key={i} className="space-y-3 rounded-2xl bg-surface-2 p-4">
          <div className="flex gap-2">
            <Input placeholder="Atividade (ex.: musculação)" value={e.tipo} onChange={(x) => upd(i, "tipo", x.target.value)} list="atividades" />
            <button type="button" onClick={() => setLista(lista.filter((_, j) => j !== i))} className="flex min-h-11 w-11 shrink-0 items-center justify-center rounded-xl text-muted hover:bg-danger-soft hover:text-danger" aria-label="Remover">
              <Trash2 size={18} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Field label="Vezes/semana">
              <Input inputMode="numeric" value={e.frequencia} onChange={(x) => upd(i, "frequencia", x.target.value)} />
            </Field>
            <Field label="Minutos">
              <Input inputMode="numeric" value={e.duracao} onChange={(x) => upd(i, "duracao", x.target.value)} />
            </Field>
            <Field label="Intensidade">
              <Select value={e.intensidade} onChange={(x) => upd(i, "intensidade", x.target.value)}>
                <option value="leve">Leve</option>
                <option value="moderada">Moderada</option>
                <option value="intensa">Intensa</option>
              </Select>
            </Field>
            <Field label="Horário">
              <Input value={e.horario} onChange={(x) => upd(i, "horario", x.target.value)} placeholder="ex.: 18h" />
            </Field>
          </div>
        </div>
      ))}
      <datalist id="atividades">
        {["Musculação", "Caminhada", "Corrida", "Ciclismo", "Natação", "Futebol", "Funcional", "Crossfit", "Pilates", "Yoga", "Dança", "Lutas"].map((a) => (
          <option key={a} value={a} />
        ))}
      </datalist>
      <Button type="button" variante="suave" onClick={() => setLista([...lista, { tipo: "", frequencia: "3", duracao: "45", intensidade: "moderada", horario: "", objetivo: "" }])}>
        <Plus size={16} /> Adicionar atividade
      </Button>
      <Rodape {...s} voltar={voltar} rotulo={rotulo} salvar={() => s.salvar({ exercicios: lista.filter((e) => e.tipo.trim()) })} />
    </div>
  );
}

// ------------------------------------------------------------------ 6 Preferências
function SeletorAlimentos({ valor, onChange, placeholder }: { valor: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  const [q, setQ] = useState("");
  const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const res = useMemo(() => (q.length < 2 ? [] : FOODS.filter((f) => norm(f.nome).includes(norm(q)) && !valor.includes(f.id)).slice(0, 8)), [q, valor]);
  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-2">
        {valor.map((id) => (
          <button key={id} type="button" onClick={() => onChange(valor.filter((x) => x !== id))} className="rounded-full bg-brand-soft px-3 py-1 text-sm font-medium text-brand-strong">
            {FOODS.find((f) => f.id === id)?.nome ?? id} ×
          </button>
        ))}
      </div>
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} />
      {res.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-2">
          {res.map((f) => (
            <button key={f.id} type="button" onClick={() => { onChange([...valor, f.id]); setQ(""); }} className="rounded-full border border-line bg-surface px-3 py-1 text-sm hover:border-brand">
              + {f.nome}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const RESTRICOES = [
  { id: "vegetariano", nome: "Vegetariano" },
  { id: "vegano", nome: "Vegano" },
  { id: "sem_gluten", nome: "Sem glúten" },
  { id: "sem_lactose", nome: "Sem lactose" },
  { id: "sem_carne_vermelha", nome: "Sem carne vermelha" },
  { id: "sem_porco", nome: "Sem porco" },
  { id: "sem_peixe", nome: "Sem peixe" },
  { id: "sem_frutos_do_mar", nome: "Sem frutos do mar" },
];

export function StepPreferencias({ p, onSalvo, voltar, rotulo }: StepProps) {
  const a = p.alimentacao;
  const pr = p.prefs;
  const [v, setV] = useState({
    alimentos_preferidos: a.preferidos,
    alimentos_rejeitados: a.rejeitados,
    alimentos_evitar: a.evitar,
    culinarias_preferidas: a.culinarias,
    restricoes: p.saude.restricoes as string[],
    modo_alimentar: a.modo as string,
    cardapio: pr.cardapio ?? "flexivel",
    repeticao: pr.repeticao ?? "media",
    marmitas: pr.marmitas ?? false,
    receitas: pr.receitas ?? true,
    unidades: pr.unidades ?? "ambos",
    mostrarMacros: pr.mostrarMacros ?? true,
  });
  const s = useSalvar(6, onSalvo);
  return (
    <div className="space-y-5">
      <Field label="Modo de alimentação">
        <div className="grid gap-2 sm:grid-cols-2">
          {MODOS.map((m) => (
            <button key={m.id} type="button" aria-pressed={v.modo_alimentar === m.id} onClick={() => setV({ ...v, modo_alimentar: m.id })} className={cx("rounded-2xl border px-4 py-3 text-left", v.modo_alimentar === m.id ? "border-brand bg-brand-soft" : "border-line bg-surface")}>
              <span className="font-semibold">{m.nome}</span>
              <span className="block text-xs text-muted">{m.descricao}</span>
            </button>
          ))}
        </div>
      </Field>
      <Field label="Culinárias que você gosta">
        <Chips opcoes={[{ id: "brasileiro", nome: "Brasileira" }, { id: "japones", nome: "Japonesa" }, { id: "mediterraneo", nome: "Mediterrânea" }]} valor={v.culinarias_preferidas} onChange={(x) => setV({ ...v, culinarias_preferidas: x })} />
      </Field>
      <Field label="Restrições alimentares">
        <Chips opcoes={RESTRICOES} valor={v.restricoes} onChange={(x) => setV({ ...v, restricoes: x })} />
      </Field>
      <Field label="Alimentos favoritos" dica="O plano vai priorizá-los.">
        <SeletorAlimentos valor={v.alimentos_preferidos} onChange={(x) => setV({ ...v, alimentos_preferidos: x })} placeholder="Busque: salmão, banana, feijão…" />
      </Field>
      <Field label="Alimentos que você não come" dica="Serão substituídos por equivalentes.">
        <SeletorAlimentos valor={v.alimentos_rejeitados} onChange={(x) => setV({ ...v, alimentos_rejeitados: x })} placeholder="Busque um alimento" />
      </Field>
      <Field label="Alimentos que prefere evitar">
        <SeletorAlimentos valor={v.alimentos_evitar} onChange={(x) => setV({ ...v, alimentos_evitar: x })} placeholder="Busque um alimento" />
      </Field>
      <Grid>
        <Field label="Estilo de cardápio">
          <Select value={v.cardapio} onChange={(e) => setV({ ...v, cardapio: e.target.value as "fechado" | "flexivel" })}>
            <option value="flexivel">Flexível — com opções de troca</option>
            <option value="fechado">Fechado — me diga exatamente o que comer</option>
          </Select>
        </Field>
        <Field label="Repetição de refeições">
          <Select value={v.repeticao} onChange={(e) => setV({ ...v, repeticao: e.target.value as "baixa" | "media" | "alta" })}>
            <option value="baixa">Pouca — gosto de variedade</option>
            <option value="media">Média</option>
            <option value="alta">Muita — repetir facilita</option>
          </Select>
        </Field>
        <Field label="Quantidades em">
          <Select value={v.unidades} onChange={(e) => setV({ ...v, unidades: e.target.value as "gramas" | "caseiras" | "ambos" })}>
            <option value="ambos">Gramas e medidas caseiras</option>
            <option value="caseiras">Medidas caseiras</option>
            <option value="gramas">Gramas</option>
          </Select>
        </Field>
      </Grid>
      <div className="space-y-2 rounded-2xl bg-surface-2 p-4 text-sm">
        {([
          ["marmitas", "Quero usar marmitas (cozinhar em lote)"],
          ["receitas", "Quero ver receitas com modo de preparo"],
          ["mostrarMacros", "Mostrar calorias e macronutrientes"],
        ] as const).map(([k, t]) => (
          <label key={k} className="flex items-center gap-3">
            <input type="checkbox" checked={v[k]} onChange={(e) => setV({ ...v, [k]: e.target.checked })} className="size-4 accent-[var(--brand)]" />
            {t}
          </label>
        ))}
      </div>
      <Rodape {...s} voltar={voltar} rotulo={rotulo} salvar={() => s.salvar(v)} />
    </div>
  );
}

// ------------------------------------------------------------------ 7 Orçamento
export function StepOrcamento({ p, onSalvo, voltar, rotulo }: StepProps) {
  const o = p.orcamento;
  const periodoIni = o.diario ? "diario" : o.semanal ? "semanal" : o.mensal ? "mensal" : "nenhum";
  const [v, setV] = useState({
    periodo: periodoIni as "diario" | "semanal" | "mensal" | "nenhum",
    valor: (o.diario ?? o.semanal ?? o.mensal ?? "").toString(),
    locais_de_compra: o.locais,
    observacoes: o.observacoes ?? "",
  });
  const s = useSalvar(7, onSalvo);
  const LOCAIS = ["Supermercado", "Atacarejo", "Feira", "Hortifrúti", "Mercado de bairro", "Delivery", "Mercado oriental"].map((x) => ({ id: x, nome: x }));
  return (
    <div className="space-y-5">
      <Field label="Quanto você pode investir em alimentação (só você)?">
        <Chips
          opcoes={[{ id: "diario", nome: "Por dia" }, { id: "semanal", nome: "Por semana" }, { id: "mensal", nome: "Por mês" }, { id: "nenhum", nome: "Prefiro não definir" }]}
          valor={[v.periodo]}
          onChange={(x) => setV({ ...v, periodo: x[0] as typeof v.periodo })}
          multiplo={false}
        />
      </Field>
      {v.periodo !== "nenhum" && (
        <Field label="Valor (R$)">
          <Input inputMode="decimal" value={v.valor} onChange={(e) => setV({ ...v, valor: e.target.value })} placeholder="ex.: 400" />
        </Field>
      )}
      <Field label="Onde costuma comprar?">
        <Chips opcoes={LOCAIS} valor={v.locais_de_compra} onChange={(x) => setV({ ...v, locais_de_compra: x })} />
      </Field>
      <Field label="Observações">
        <Input value={v.observacoes} onChange={(e) => setV({ ...v, observacoes: e.target.value })} placeholder="ex.: compro para 2 pessoas" />
      </Field>
      <Rodape {...s} voltar={voltar} rotulo={rotulo} salvar={() => s.salvar({ ...v, valor: v.periodo === "nenhum" ? null : v.valor.replace(",", ".") })} />
    </div>
  );
}

export const ETAPAS = [
  { nome: "Perfil", C: StepPerfil },
  { nome: "Objetivo", C: StepObjetivo },
  { nome: "Rotina", C: StepRotina },
  { nome: "Alimentação", C: StepAlimentacao },
  { nome: "Saúde", C: StepSaude },
  { nome: "Exercícios", C: StepExercicios },
  { nome: "Preferências", C: StepPreferencias },
  { nome: "Orçamento", C: StepOrcamento },
] as const;
