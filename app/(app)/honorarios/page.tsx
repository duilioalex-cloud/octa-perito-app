export const metadata = { title: "Honorários" };

export default function FeesPage() {
  return (
    <><header className="page-header"><div><p className="eyebrow">GESTÃO FINANCEIRA</p><h1>Honorários periciais</h1><p>Memória de cálculo, valores propostos, arbitrados e recebidos.</p></div></header><section className="card form-card"><div className="panel-header"><h2>Calculadora — estrutura inicial</h2></div><div className="form-grid"><label className="field"><span>Horas técnicas estimadas</span><input className="input" type="number" placeholder="40" disabled /></label><label className="field"><span>Valor da hora</span><input className="input" placeholder="R$ 350,00" disabled /></label><label className="field"><span>Deslocamento</span><input className="input" placeholder="380 km" disabled /></label><label className="field"><span>Complexidade</span><select className="select" disabled><option>Alta</option></select></label></div><div className="notice notice-success" style={{ marginTop: 22 }}>O motor de cálculo e a geração da justificativa de honorários serão implementados após a validação do login e dos processos.</div></section></>
  );
}
