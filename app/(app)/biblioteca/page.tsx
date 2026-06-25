export const metadata = { title: "Biblioteca técnica" };

const items = [
  ["PETIÇÃO", "Aceite com proposta de honorários", "Modelo estruturado para manifestação de aceite e apresentação do valor técnico."],
  ["PETIÇÃO", "Pedido de majoração", "Fundamentação por complexidade, horas técnicas, deslocamento e custos."],
  ["PETIÇÃO", "Agendamento de diligência", "Comunicação de data, horário, local e orientações às partes."],
  ["LAUDO", "Estrutura de laudo ambiental", "Objeto, metodologia, diligência, análise, quesitos e conclusão."],
  ["LAUDO", "Estrutura de insalubridade", "Organização da prova documental, qualitativa e quantitativa."],
  ["CHECKLIST", "Preparação da diligência", "Documentos, equipamentos, participantes, registros e pendências."],
];

export default function LibraryPage() {
  return (
    <><header className="page-header"><div><p className="eyebrow">PRODUÇÃO DOCUMENTAL</p><h1>Biblioteca técnica</h1><p>Modelos OCTA, modelos pessoais e blocos reutilizáveis.</p></div><button className="button button-primary" disabled>+ Novo modelo</button></header><section className="library-grid">{items.map(([tag,title,description]) => <article className="card library-card" key={title}><span className="tag">{tag}</span><h3>{title}</h3><p>{description}</p></article>)}</section><div className="notice notice-success" style={{ marginTop: 22 }}>Esta tela é a base visual. O editor de modelos, campos dinâmicos e exportação Word entram na próxima etapa.</div></>
  );
}
