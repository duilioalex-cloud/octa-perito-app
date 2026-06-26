"use client";

import { useMemo, useState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { replaceTemplateVariables, variableLabel } from "@/lib/document-options";

type Props = {
  title: string;
  templateBody: string;
  variables: string[];
  initialValues: Record<string, string>;
  action: (formData: FormData) => void | Promise<void>;
};

export function DocumentGenerator({ title, templateBody, variables, initialValues, action }: Props) {
  const [values, setValues] = useState(initialValues);
  const [content, setContent] = useState(() => replaceTemplateVariables(templateBody, initialValues));
  const generated = useMemo(() => replaceTemplateVariables(templateBody, values), [templateBody, values]);

  function updateValue(key: string, value: string) {
    const next = { ...values, [key]: value };
    setValues(next);
    setContent(replaceTemplateVariables(templateBody, next));
  }

  return (
    <form action={action} className="generator-layout">
      <section className="card panel generator-fields">
        <div className="panel-header"><div><h2>Campos do documento</h2><span>{variables.length} variável(is)</span></div></div>
        <label className="field"><span>Título do documento</span><input className="input" name="title" defaultValue={title} required /></label>
        <div className="variable-form">
          {variables.map((variable) => (
            <label className="field" key={variable}>
              <span>{variableLabel(variable)}</span>
              {/(atividades|custos|justificativa|fundamentacao|documentos|orientacoes|questoes|respostas|pedido|situacao|anexos|impacto)/.test(variable)
                ? <textarea className="textarea textarea-small" value={values[variable] || ""} onChange={(event) => updateValue(variable, event.target.value)} />
                : <input className="input" value={values[variable] || ""} onChange={(event) => updateValue(variable, event.target.value)} />}
            </label>
          ))}
        </div>
        <button className="button button-secondary button-full" type="button" onClick={() => setContent(generated)}>Reaplicar campos no texto</button>
      </section>

      <section className="card panel generator-editor">
        <div className="panel-header"><div><h2>Revisão do documento</h2><span>Edite livremente antes de salvar</span></div></div>
        <textarea className="document-editor" name="content" value={content} onChange={(event) => setContent(event.target.value)} required />
        <input type="hidden" name="variables_json" value={JSON.stringify(values)} />
        <div className="generator-actions"><span>Campos vazios aparecem como [INFORMAÇÃO NÃO PREENCHIDA].</span><SubmitButton pendingText="Salvando...">Salvar documento</SubmitButton></div>
      </section>
    </form>
  );
}
