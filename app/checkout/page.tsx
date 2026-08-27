"use client";

import { useState } from "react";
import Link from "next/link";
import { StorefrontFooter, StorefrontHeader } from "@/components/Storefront";
import { useCart } from "@/components/CartProvider";
import { formatCurrency } from "@/lib/utils";

export default function CheckoutPage() {
  const { items, totalCents } = useCart();

  const [couponCode, setCouponCode] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const checkout = async () => {
    setError("");

    if (!customerName.trim()) {
      setError("Informe seu nome.");
      return;
    }

    if (!customerEmail.trim()) {
      setError("Informe seu e-mail.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productIds: items.map((item) => item.id),
          couponCode,
          customerName,
          customerEmail,
        }),
      });

      const data = (await response.json()) as {
        checkoutUrl?: string;
        error?: string;
      };

      if (!response.ok || !data.checkoutUrl) {
        throw new Error(
          data.error ?? "Não foi possível iniciar o pagamento."
        );
      }

      window.location.assign(data.checkoutUrl);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Erro inesperado."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <StorefrontHeader />

      <main className="page container">
        <h1
          style={{
            fontSize: "clamp(42px,6vw,66px)",
          }}
        >
          Finalizar compra
        </h1>

        <p className="lead">
          Informe seus dados para receber acesso aos seus materiais após a
          confirmação do pagamento.
        </p>

        {!items.length ? (
          <div className="empty">
            Seu carrinho está vazio.{" "}
            <Link className="link" href="/produtos">
              Escolher materiais
            </Link>
          </div>
        ) : (
          <div className="split">
            <section className="panel">
              <h2>Seus materiais</h2>

              {items.map((item) => (
                <div key={item.id} className="cart-line">
                  <div className="art-mini" />

                  <div style={{ flex: 1 }}>
                    <b>{item.title}</b>

                    <div className="price">
                      {formatCurrency(item.effectivePriceCents)}
                    </div>
                  </div>
                </div>
              ))}

              <div
                style={{
                  display: "grid",
                  gap: 14,
                  marginTop: 24,
                }}
              >
                <h2>Seus dados</h2>

                <label
                  style={{
                    display: "grid",
                    gap: 7,
                    fontWeight: 800,
                  }}
                >
                  Nome

                  <input
                    className="input"
                    type="text"
                    value={customerName}
                    onChange={(event) =>
                      setCustomerName(event.target.value)
                    }
                    placeholder="Seu nome completo"
                    autoComplete="name"
                  />
                </label>

                <label
                  style={{
                    display: "grid",
                    gap: 7,
                    fontWeight: 800,
                  }}
                >
                  E-mail

                  <input
                    className="input"
                    type="email"
                    value={customerEmail}
                    onChange={(event) =>
                      setCustomerEmail(event.target.value)
                    }
                    placeholder="voce@email.com"
                    autoComplete="email"
                  />
                </label>

                <p
                  style={{
                    fontSize: 13,
                    color: "var(--muted)",
                    margin: 0,
                  }}
                >
                  Usaremos este e-mail para enviar informações sobre sua compra
                  e o acesso aos materiais.
                </p>

                <label
                  style={{
                    display: "grid",
                    gap: 7,
                    fontWeight: 800,
                  }}
                >
                  Cupom de desconto

                  <input
                    className="input"
                    value={couponCode}
                    onChange={(event) =>
                      setCouponCode(
                        event.target.value.toUpperCase()
                      )
                    }
                    placeholder="EXEMPLO10"
                  />
                </label>
              </div>

              {error ? (
                <p className="error">{error}</p>
              ) : null}
            </section>

            <aside className="summary">
              <h2>Total estimado</h2>

              <p
                className="price"
                style={{
                  color: "white",
                  fontSize: 34,
                }}
              >
                {formatCurrency(totalCents)}
              </p>

              <button
                className="button yellow"
                style={{
                  width: "100%",
                }}
                disabled={loading}
                onClick={checkout}
              >
                {loading
                  ? "Abrindo checkout..."
                  : "Pagar com Mercado Pago →"}
              </button>

              <p style={{ fontSize: 12 }}>
                PIX e cartão são selecionados no ambiente seguro do Mercado
                Pago.
              </p>
            </aside>
          </div>
        )}
      </main>

      <StorefrontFooter />
    </>
  );
}