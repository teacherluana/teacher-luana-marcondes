"use client";

import Link from "next/link";
import { useCart } from "@/components/CartProvider";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { useEffect, useState } from "react";

export function StorefrontHeader({
  isAdmin = false,
}: {
  isAdmin?: boolean;
}) {
  const { items } = useCart();
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();

    void supabase.auth
      .getUser()
      .then(({ data }) => setSignedIn(Boolean(data.user)));
  }, []);

  const logout = async () => {
    await createBrowserSupabaseClient().auth.signOut();
    window.location.assign("/");
  };

  return (
    <>
      <div className="topbar">
        Materiais digitais com acesso seguro após a compra.
      </div>

      <header className="header">
        <div className="container header-inner">
          <Link href="/" className="brand">
            <span className="brand-mark">TLM</span>

            <span>
              Teacher Luana Marcondes
              <small>Materiais que inspiram.</small>
            </span>
          </Link>

          <nav className="nav">
            <Link href="/produtos">Materiais</Link>
            <Link href="/categorias/educacao-infantil">Categorias</Link>
            <Link href="/sobre">Sobre</Link>
          </nav>

          <div className="header-actions">
            {signedIn ? (
              <>
                <Link href={isAdmin ? "/admin" : "/minhas-compras"}>
                  ⌁{" "}
                  <span>
                    {isAdmin
                      ? "Painel administrativo"
                      : "Minha conta"}
                  </span>
                </Link>

                <button className="link" onClick={logout}>
                  Sair
                </button>
              </>
            ) : (
              <Link href="/login">Entrar</Link>
            )}

            <Link
              className="icon-btn"
              href="/carrinho"
              aria-label="Abrir carrinho"
            >
              🛍
              {items.length ? <sup>{items.length}</sup> : null}
            </Link>
          </div>
        </div>
      </header>
    </>
  );
}

export function StorefrontFooter() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div>
          <h2>Teacher Luana Marcondes</h2>

          <p>
            Materiais digitais para deixar o inglês dos anos iniciais mais
            leve, criativo e cheio de brincadeira.
          </p>
        </div>

        <div>
          <b>Navegue</b>

          <p>
            <Link href="/produtos">Materiais</Link>
            <br />
            <Link href="/minhas-compras">Minhas Compras</Link>
            <br />
            <Link href="/sobre">Sobre</Link>
          </p>
        </div>

        <div>
          <b>Ajuda</b>

          <p>
            <Link href="/contato">Fale com a Luana</Link>
            <br />
            <Link href="/termos">Termos de uso</Link>
            <br />
            <Link href="/privacidade">Privacidade</Link>
          </p>
        </div>
      </div>

      <div className="container">
        <small>
          © {new Date().getFullYear()} Teacher Luana Marcondes. Todos os
          direitos reservados.
        </small>
      </div>
    </footer>
  );
}