import Link from "next/link";

export default function PurchaseSuccessPage() {
  return (
    <main className="purchase-success-page">
      <section className="card purchase-success-card">
        <p className="eyebrow">OCTA Perito</p>
        <h1>Compra recebida</h1>
        <p>
          Assim que a Abacate Pay confirmar o pagamento, criaremos o escritorio no OCTA Perito e enviaremos o convite de
          acesso para o e-mail usado na compra.
        </p>
        <div className="purchase-success-actions">
          <Link className="button button-primary" href="/login">Ir para o login</Link>
          <Link className="button button-secondary" href="/">Voltar</Link>
        </div>
      </section>
    </main>
  );
}
