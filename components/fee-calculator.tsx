"use client";

import { useMemo, useState } from "react";
import { SubmitButton } from "@/components/submit-button";

const stageFields = [
  ["reading", "Leitura da nomeação"],
  ["initial_study", "Estudo inicial"],
  ["document_analysis", "Análise de documentos"],
  ["questions_analysis", "Análise dos quesitos"],
  ["planning", "Planejamento"],
  ["inspection", "Vistoria/diligência"],
  ["travel", "Deslocamento"],
  ["technical_survey", "Levantamento técnico"],
  ["research", "Pesquisas/normas"],
  ["calculations", "Cálculos e análises"],
  ["report_writing", "Elaboração do laudo"],
  ["technical_review", "Revisão técnica"],
  ["clarifications", "Esclarecimentos"],
  ["hearing", "Audiência técnica"],
] as const;

const expenseFields = [
  ["toll_amount", "Pedágio"],
  ["parking_amount", "Estacionamento"],
  ["meal_amount", "Alimentação"],
  ["lodging_amount", "Hospedagem"],
  ["ticket_amount", "Passagens"],
  ["art_amount", "ART/RRT"],
  ["laboratory_amount", "Ensaios/laboratório"],
  ["topography_amount", "Topografia"],
  ["drone_amount", "Drone"],
  ["printing_amount", "Impressões/cópias"],
  ["registry_amount", "Certidões/cartório"],
  ["equipment_amount", "Equipamentos especiais"],
  ["other_expenses", "Outras despesas"],
] as const;

const complexityOptions = [
  ["low", "Baixa", 1],
  ["medium", "Média", 1.25],
  ["high", "Alta", 1.5],
  ["very_high", "Muito alta", 2],
] as const;

const justiceOptions = [
  ["estadual", "Justiça Estadual"],
  ["federal", "Justiça Federal"],
  ["jef", "Juizado Especial Federal"],
  ["trabalho", "Justiça do Trabalho"],
  ["extrajudicial", "Perícia extrajudicial"],
  ["arbitragem", "Arbitragem"],
  ["assistencia_tecnica", "Assistência técnica"],
] as const;

const expertiseOptions = [
  "Engenharia civil",
  "Avaliação de imóvel urbano",
  "Avaliação de imóvel rural",
  "Engenharia ambiental",
  "Segurança do trabalho",
  "Insalubridade/periculosidade",
  "Contábil",
  "Médica",
  "Odontológica",
  "Psicológica",
  "Serviço social",
  "Grafotécnica",
  "Avaliação de máquinas/equipamentos",
  "Perícia complementar",
  "Esclarecimentos sobre laudo",
  "Audiência técnica",
];

type ProcessInfo = {
  processNumber: string;
  court: string;
  district: string;
  division: string;
  caseClass: string;
  subject: string;
  appointedAt: string;
  reportDueAt: string;
  expertiseArea: string;
};

type Summary = {
  proposedTotal: number;
  approvedTotal: number;
  operationalCost: number;
  forecastResult: number;
};

type InitialCalculator = {
  calculator?: Record<string, any>;
  memoryText?: string;
};

type FeeCalculatorProps = {
  action: (formData: FormData) => void | Promise<void>;
  processInfo: ProcessInfo;
  summary: Summary;
  initial?: InitialCalculator | null;
};

function asNumber(value: unknown, fallback = 0) {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toInput(value: unknown, fallback = "") {
  if (value === null || value === undefined || value === "") return fallback;
  const number = Number(value);
  return Number.isFinite(number) ? String(number) : String(value);
}

function money(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number.isFinite(value) ? value : 0);
}

export function FeeCalculator({ action, processInfo, summary, initial }: FeeCalculatorProps) {
  const calculator: Record<string, any> = initial?.calculator ?? {};
  const stageHours = (calculator.stage_hours || {}) as Record<string, unknown>;
  const expenses = (calculator.expenses || {}) as Record<string, unknown>;

  const defaultValues: Record<string, string> = {
    calculator_expertise_area: String(calculator.expertise_area || processInfo.expertiseArea || "Engenharia civil"),
    justice_branch: String(calculator.justice_branch || "estadual"),
    applicable_table: String(calculator.applicable_table || ""),
    table_limit_amount: toInput(calculator.table_limit_amount),
    responsible_party: String(calculator.responsible_party || ""),
    technical_hour_rate: toInput(calculator.technical_hour_rate, "180"),
    assistant_hours: toInput(calculator.assistant_hours),
    assistant_hour_rate: toInput(calculator.assistant_hour_rate, "90"),
    urgency_amount: toInput(calculator.urgency_amount),
    risk_amount: toInput(calculator.risk_amount),
    manual_adjustment: toInput(calculator.manual_adjustment),
    minimum_fee: toInput(calculator.minimum_fee),
    tax_percent: toInput(calculator.tax_percent),
    total_km: toInput(calculator.total_km),
    km_rate: toInput(calculator.km_rate, "1.20"),
    advance_percentage: toInput(calculator.totals?.advance_percentage, "50"),
    custom_justification: String(calculator.custom_justification || ""),
  };

  for (const [key] of stageFields) defaultValues[`hours_${key}`] = toInput(stageHours[key]);
  for (const [key, label] of expenseFields) defaultValues[key] = toInput(expenses[label]);

  const [values, setValues] = useState(defaultValues);
  const [complexity, setComplexity] = useState(String(calculator.complexity || "medium"));
  const [legalAid, setLegalAid] = useState(Boolean(calculator.legal_aid));
  const [responsibilityType, setResponsibilityType] = useState(String(calculator.responsibility_type || "not_defined"));

  function setField(name: string, value: string) {
    setValues((current) => ({ ...current, [name]: value }));
  }

  function n(name: string) {
    const raw = String(values[name] || "").replace(/\s/g, "").replace(",", ".");
    const value = Number(raw);
    return Number.isFinite(value) ? value : 0;
  }

  const result = useMemo(() => {
    const hoursTotal = stageFields.reduce((sum, [key]) => sum + n(`hours_${key}`), 0);
    const technicalBase = hoursTotal * n("technical_hour_rate");
    const assistantTotal = n("assistant_hours") * n("assistant_hour_rate");
    const baseProfessional = technicalBase + assistantTotal;
    const multiplier = asNumber(complexityOptions.find(([key]) => key === complexity)?.[2], 1);
    const complexityAmount = baseProfessional * Math.max(0, multiplier - 1);
    const professionalBeforeTax = Math.max(
      n("minimum_fee"),
      baseProfessional + complexityAmount + n("urgency_amount") + n("risk_amount") + n("manual_adjustment"),
    );
    const taxAmount = professionalBeforeTax * Math.min(100, Math.max(0, n("tax_percent"))) / 100;
    const professionalTotal = professionalBeforeTax + taxAmount;
    const displacement = n("total_km") * n("km_rate");
    const directExpenses = expenseFields.reduce((sum, [key]) => sum + n(key), displacement);
    const totalSuggested = professionalTotal + directExpenses;
    const advancePercentage = Math.min(100, Math.max(0, n("advance_percentage")));
    const advanceAmount = totalSuggested * advancePercentage / 100;
    const tableLimit = n("table_limit_amount");

    return {
      hoursTotal,
      technicalBase,
      assistantTotal,
      complexityAmount,
      professionalTotal,
      directExpenses,
      totalSuggested,
      advancePercentage,
      advanceAmount,
      balanceAmount: totalSuggested - advanceAmount,
      tableLimit,
      aboveTable: tableLimit > 0 && totalSuggested > tableLimit,
    };
  }, [values, complexity]);

  const memoryPreview = [
    `Foram estimadas ${result.hoursTotal.toLocaleString("pt-BR")} horas técnicas para estudo dos autos, diligência, análises, elaboração do laudo, revisão e esclarecimentos.`,
    `Honorários técnicos estimados: ${money(result.professionalTotal)}.`,
    `Despesas operacionais estimadas: ${money(result.directExpenses)}.`,
    `Total sugerido da proposta: ${money(result.totalSuggested)}.`,
    `Depósito inicial sugerido (${result.advancePercentage.toLocaleString("pt-BR")}%): ${money(result.advanceAmount)}.`,
    legalAid ? "Justiça gratuita marcada: conferir tabela aplicável e fundamentar eventual pedido acima do limite." : "",
    result.aboveTable ? "Atenção: o valor sugerido supera a tabela/limite informado." : "",
  ].filter(Boolean).join("\n");

  return (
    <article className="card panel fee-calculator-card">
      <div className="panel-header calculator-header">
        <div>
          <h2>Calculadora de honorários</h2>
          <span>Calcula proposta, memória técnica e custo estimado vinculado ao processo.</span>
        </div>
        <a className="button button-ghost button-small" href="#memoria-honorarios">Ver memória</a>
      </div>

      <form className="fee-calculator-form" action={action}>
        <div className="calculator-kpis">
          <div><span>Honorários técnicos</span><strong>{money(result.professionalTotal)}</strong></div>
          <div><span>Despesas estimadas</span><strong>{money(result.directExpenses)}</strong></div>
          <div><span>Total sugerido</span><strong>{money(result.totalSuggested)}</strong></div>
          <div><span>Depósito inicial</span><strong>{money(result.advanceAmount)}</strong></div>
        </div>

        <div className="calculator-process-facts">
          <div><span>Processo</span><strong>{processInfo.processNumber}</strong></div>
          <div><span>Tribunal</span><strong>{processInfo.court || "Não informado"}</strong></div>
          <div><span>Vara/comarca</span><strong>{[processInfo.division, processInfo.district].filter(Boolean).join(" / ") || "Não informado"}</strong></div>
          <div><span>Classe processual</span><strong>{processInfo.caseClass || "Não informada"}</strong></div>
          <div><span>Objeto</span><strong>{processInfo.subject || "Não informado"}</strong></div>
          <div><span>Nomeação</span><strong>{processInfo.appointedAt || "Não definida"}</strong></div>
          <div><span>Prazo do laudo</span><strong>{processInfo.reportDueAt || "Não definido"}</strong></div>
        </div>

        <div className="calculator-section">
          <div className="finance-form-divider full"><strong>Parâmetros da proposta</strong><span>Use parâmetros internos do escritório; tabelas oficiais continuam conferíveis pelo perito.</span></div>
          <label className="field"><span>Tipo de perícia</span><select className="select" name="calculator_expertise_area" value={values.calculator_expertise_area} onChange={(event) => setField("calculator_expertise_area", event.target.value)}>{expertiseOptions.map((option) => <option value={option} key={option}>{option}</option>)}</select></label>
          <label className="field"><span>Ramo da justiça</span><select className="select" name="justice_branch" value={values.justice_branch} onChange={(event) => setField("justice_branch", event.target.value)}>{justiceOptions.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
          <label className="field"><span>Responsabilidade pelo pagamento</span><select className="select" name="responsibility_type" value={responsibilityType} onChange={(event) => setResponsibilityType(event.target.value)}>
            <option value="not_defined">Não definido</option>
            <option value="plaintiff">Autor</option>
            <option value="defendant">Réu</option>
            <option value="both_parties">Ambas as partes</option>
            <option value="legal_aid">Justiça gratuita/AJG</option>
            <option value="court">Juízo</option>
            <option value="client">Cliente</option>
            <option value="other">Outro</option>
          </select></label>
          <label className="field"><span>Parte responsável</span><input className="input" name="responsible_party" value={values.responsible_party} onChange={(event) => setField("responsible_party", event.target.value)} placeholder="Ex.: réu, partes em rateio, AJG" /></label>
          <label className="check-line calculator-check"><input type="checkbox" name="legal_aid" checked={legalAid} onChange={(event) => setLegalAid(event.target.checked)} /> Existe justiça gratuita/AJG?</label>
        </div>

        <div className="calculator-section">
          <div className="finance-form-divider full"><strong>Horas técnicas por etapa</strong><span>O total de horas entra na memória de cálculo da proposta.</span></div>
          {stageFields.map(([key, label]) => (
            <label className="field" key={key}><span>{label}</span><input className="input" type="number" min="0" step="0.25" name={`hours_${key}`} value={values[`hours_${key}`]} onChange={(event) => setField(`hours_${key}`, event.target.value)} /></label>
          ))}
        </div>

        <div className="calculator-section">
          <div className="finance-form-divider full"><strong>Valor hora, equipe e ajustes</strong><span>Complexidade é critério interno configurável, não regra legal automática.</span></div>
          <label className="field"><span>Hora técnica do perito</span><input className="input" type="number" min="0" step="0.01" name="technical_hour_rate" value={values.technical_hour_rate} onChange={(event) => setField("technical_hour_rate", event.target.value)} /></label>
          <label className="field"><span>Complexidade</span><select className="select" name="complexity" value={complexity} onChange={(event) => setComplexity(event.target.value)}>{complexityOptions.map(([value, label, multiplier]) => <option value={value} key={value}>{label} × {multiplier.toLocaleString("pt-BR")}</option>)}</select></label>
          <label className="field"><span>Horas de equipe auxiliar</span><input className="input" type="number" min="0" step="0.25" name="assistant_hours" value={values.assistant_hours} onChange={(event) => setField("assistant_hours", event.target.value)} /></label>
          <label className="field"><span>Hora da equipe auxiliar</span><input className="input" type="number" min="0" step="0.01" name="assistant_hour_rate" value={values.assistant_hour_rate} onChange={(event) => setField("assistant_hour_rate", event.target.value)} /></label>
          <label className="field"><span>Ajuste por urgência</span><input className="input" type="number" min="0" step="0.01" name="urgency_amount" value={values.urgency_amount} onChange={(event) => setField("urgency_amount", event.target.value)} /></label>
          <label className="field"><span>Ajuste por risco/dificuldade</span><input className="input" type="number" min="0" step="0.01" name="risk_amount" value={values.risk_amount} onChange={(event) => setField("risk_amount", event.target.value)} /></label>
          <label className="field"><span>Ajuste manual</span><input className="input" type="number" min="0" step="0.01" name="manual_adjustment" value={values.manual_adjustment} onChange={(event) => setField("manual_adjustment", event.target.value)} /></label>
          <label className="field"><span>Honorário mínimo</span><input className="input" type="number" min="0" step="0.01" name="minimum_fee" value={values.minimum_fee} onChange={(event) => setField("minimum_fee", event.target.value)} /></label>
          <label className="field"><span>Tributos/retenções (%)</span><input className="input" type="number" min="0" max="100" step="0.01" name="tax_percent" value={values.tax_percent} onChange={(event) => setField("tax_percent", event.target.value)} /></label>
          <label className="field"><span>Depósito inicial sugerido (%)</span><input className="input" type="number" min="0" max="100" step="0.01" name="advance_percentage" value={values.advance_percentage} onChange={(event) => setField("advance_percentage", event.target.value)} /></label>
        </div>

        <div className="calculator-section">
          <div className="finance-form-divider full"><strong>Despesas operacionais</strong><span>Essas despesas serão salvas como custo estimado do processo.</span></div>
          <label className="field"><span>Km total estimado</span><input className="input" type="number" min="0" step="0.01" name="total_km" value={values.total_km} onChange={(event) => setField("total_km", event.target.value)} /></label>
          <label className="field"><span>Valor por km</span><input className="input" type="number" min="0" step="0.01" name="km_rate" value={values.km_rate} onChange={(event) => setField("km_rate", event.target.value)} /></label>
          {expenseFields.map(([key, label]) => (
            <label className="field" key={key}><span>{label}</span><input className="input" type="number" min="0" step="0.01" name={key} value={values[key]} onChange={(event) => setField(key, event.target.value)} /></label>
          ))}
        </div>

        <div className="calculator-section">
          <div className="finance-form-divider full"><strong>Tabela aplicável e justificativa</strong><span>Informe limite/tabela quando houver AJG ou referência local.</span></div>
          <label className="field"><span>Tabela/referência</span><input className="input" name="applicable_table" value={values.applicable_table} onChange={(event) => setField("applicable_table", event.target.value)} placeholder="Ex.: tabela TJMG, CNJ, CSJT, CJF ou manual" /></label>
          <label className="field"><span>Limite informado</span><input className="input" type="number" min="0" step="0.01" name="table_limit_amount" value={values.table_limit_amount} onChange={(event) => setField("table_limit_amount", event.target.value)} /></label>
          {result.aboveTable && <div className="notice notice-error full">O total sugerido está acima da tabela/limite informado. Fundamente com complexidade, horas, deslocamento, equipe, risco e peculiaridades do caso.</div>}
          <label className="field full"><span>Justificativa complementar</span><textarea className="textarea textarea-small" name="custom_justification" value={values.custom_justification} onChange={(event) => setField("custom_justification", event.target.value)} placeholder="Ex.: volume documental, múltiplos locais, risco, urgência, equipamentos, quesitos complexos..." /></label>
        </div>

        <div className="calculator-memory" id="memoria-honorarios">
          <div className="panel-header"><h3>Memória pronta para proposta</h3><span>Será salva nos honorários do processo.</span></div>
          <pre>{memoryPreview}</pre>
        </div>

        <div className="calculator-saved-summary">
          <div><span>Já proposto no processo</span><strong>{money(summary.proposedTotal)}</strong></div>
          <div><span>Homologado</span><strong>{money(summary.approvedTotal)}</strong></div>
          <div><span>Custo previsto atual</span><strong>{money(summary.operationalCost)}</strong></div>
          <div><span>Resultado previsto</span><strong>{money(summary.forecastResult)}</strong></div>
        </div>

        <div className="form-actions full">
          <SubmitButton className="button button-primary" pendingText="Salvando cálculo...">Salvar no processo</SubmitButton>
        </div>
      </form>
    </article>
  );
}
