"use client";

import { useMemo, useState } from "react";
import type { HotmartProduct } from "@/lib/hotmart";

export function HotmartProductSelector({
  products,
}: {
  products: HotmartProduct[];
}) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<number>>(
    new Set()
  );

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) {
      return products;
    }

    return products.filter((product) => {
      return (
        product.name.toLowerCase().includes(term) ||
        String(product.id).includes(term) ||
        product.status.toLowerCase().includes(term) ||
        product.format.toLowerCase().includes(term)
      );
    });
  }, [products, search]);

  const allFilteredSelected =
    filteredProducts.length > 0 &&
    filteredProducts.every((product) =>
      selected.has(product.id)
    );

  function toggleProduct(id: number) {
    setSelected((current) => {
      const next = new Set(current);

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });
  }

  function toggleAllFiltered() {
    setSelected((current) => {
      const next = new Set(current);

      if (allFilteredSelected) {
        filteredProducts.forEach((product) => {
          next.delete(product.id);
        });
      } else {
        filteredProducts.forEach((product) => {
          next.add(product.id);
        });
      }

      return next;
    });
  }

  function clearSelection() {
    setSelected(new Set());
  }

  return (
    <>
      <div
        className="panel"
        style={{
          marginBottom: 18,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <input
            type="search"
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="Pesquisar produto..."
            style={{
              flex: "1 1 320px",
              minWidth: 240,
              padding: "11px 14px",
              border: "1px solid #d8d0b7",
              borderRadius: 8,
              fontSize: 15,
              background: "white",
            }}
          />

          <button
            type="button"
            className="button"
            onClick={toggleAllFiltered}
            disabled={!filteredProducts.length}
          >
            {allFilteredSelected
              ? "Desmarcar todos"
              : "Selecionar todos"}
          </button>

          <button
            type="button"
            className="button"
            onClick={clearSelection}
            disabled={selected.size === 0}
          >
            Limpar seleção
          </button>
        </div>

        <div
          style={{
            marginTop: 12,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              color: "var(--muted)",
              fontSize: 14,
            }}
          >
            {filteredProducts.length} produto(s)
            {search.trim()
              ? " encontrado(s) na pesquisa."
              : " exibido(s)."}
          </span>

          <strong>
            {selected.size} produto(s) selecionado(s)
          </strong>
        </div>
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Selecionar</th>
              <th>ID</th>
              <th>Produto</th>
              <th>Status</th>
              <th>Formato</th>
            </tr>
          </thead>

          <tbody>
            {filteredProducts.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  style={{
                    textAlign: "center",
                    padding: 30,
                    color: "var(--muted)",
                  }}
                >
                  Nenhum produto encontrado.
                </td>
              </tr>
            ) : (
              filteredProducts.map((product) => (
                <tr key={product.id}>
                  <td>
                    <input
                      type="checkbox"
                      name="hotmart_product"
                      value={product.id}
                      checked={selected.has(product.id)}
                      onChange={() =>
                        toggleProduct(product.id)
                      }
                    />
                  </td>

                  <td>
                    <code>{product.id}</code>
                  </td>

                  <td>
                    <strong>{product.name}</strong>
                  </td>

                  <td>
                    <span className="pill">
                      {product.status}
                    </span>
                  </td>

                  <td>{product.format}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}