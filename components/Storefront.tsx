"use client";

import Link from "next/link";
import { useCart } from "@/components/CartProvider";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { useEffect, useState } from "react";

export function StorefrontHeader({
  isAdmin: forceAdmin = false,
}: {
  isAdmin?: boolean;
}) {
  const { items } = useCart();

  const [signedIn, setSignedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();

    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setSignedIn(false);
        setIsAdmin(false);
        return;
      }

      setSignedIn(true);

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      setIsAdmin(profile?.role === "admin");
    }

    void loadUser();
  }, []);

  const logout = async () => {
    await createBrowserSupabaseClient().auth.signOut();
    window.location.assign("/");
  };

  const userIsAdmin = forceAdmin || isAdmin;

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
            <Link href="/categorias/educacao-infantil">
              Categorias
            </Link>
            <Link href="/sobre">Sobre</Link>
          </nav>

          <div className="header-actions">
            {signedIn ? (
              <>
                <Link
                  href={
                    userIsAdmin
                      ? "/admin"
                      : "/minhas-compras"
                  }
                >
                  ⌁{" "}
                  <span>
                    {userIsAdmin
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