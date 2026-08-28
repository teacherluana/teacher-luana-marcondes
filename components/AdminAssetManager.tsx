"use client";

import { useEffect, useState } from "react";

type AssetKind = "pdf" | "cover" | "preview";

type Asset = {
  id?: string;
  path: string;
  filename?: string;
  mimeType?: string;
  byteSize?: number;
  createdAt?: string;
};

type AssetsResponse = {
  cover: Asset | null;
  pdf: Asset | null;
  previews: Asset[];
};

type ApiError = {
  error?: string;
};

export function AdminAssetManager({
  productId,
}: {
  productId: string;
}) {
  const [assets, setAssets] = useState<AssetsResponse>({
    cover: null,
    pdf: null,
    previews: [],
  });

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadAssets() {
    setLoading(true);

    try {
      const response = await fetch(
        `/api/admin/assets?productId=${encodeURIComponent(productId)}`,
        {
          cache: "no-store",
        }
      );

      const result = await response.json();

      if (!response.ok) {
        const errorResult = result as ApiError;

        throw new Error(
          errorResult.error ??
            "Não foi possível carregar os arquivos."
        );
      }

      const assetsResult = result as AssetsResponse;

      setAssets(assetsResult);
      setMessage("");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar os arquivos."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAssets();
  }, [productId]);

  async function removeAsset(
    kind: AssetKind,
    path?: string
  ) {
    const confirmed = window.confirm(
      "Tem certeza que deseja excluir este arquivo?"
    );

    if (!confirmed) {
      return;
    }

    setMessage("Excluindo arquivo...");

    try {
      const response = await fetch("/api/admin/assets", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId,
          kind,
          path,
        }),
      });

      const result = (await response.json()) as ApiError;

      if (!response.ok) {
        throw new Error(
          result.error ??
            "Não foi possível excluir o arquivo."
        );
      }

      setMessage("Arquivo excluído com sucesso.");

      await loadAssets();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível excluir o arquivo."
      );
    }
  }

  function openAsset(path: string) {
    window.open(
      `/api/admin/assets/view?path=${encodeURIComponent(path)}`,
      "_blank"
    );
  }

  function formatSize(bytes?: number) {
    if (!bytes) {
      return "";
    }

    if (bytes < 1024 * 1024) {
      return `${Math.round(bytes / 1024)} KB`;
    }

    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  if (loading) {
    return (
      <div className="notice">
        Carregando arquivos...
      </div>
    );
  }

  return (
    <div
      className="stack"
      style={{
        borderTop: "1px solid var(--line)",
        paddingTop: 24,
      }}
    >
      <div>
        <h2
          style={{
            fontSize: 28,
            marginBottom: 6,
          }}
        >
          Arquivos do produto
        </h2>

        <p
          style={{
            color: "var(--muted)",
            margin: 0,
          }}
        >
          Área exclusiva do administrador. Os arquivos
          privados não ficam disponíveis publicamente.
        </p>
      </div>

      {message ? (
        <div className="notice">
          {message}
        </div>
      ) : null}

      <AssetCard
        title="Capa"
        asset={assets.cover}
        privateFile={false}
        onView={
          assets.cover
            ? () => openAsset(assets.cover!.path)
            : undefined
        }
        onDelete={
          assets.cover
            ? () => void removeAsset("cover")
            : undefined
        }
        accept="Imagem"
      />

      <AssetCard
        title="PDF completo"
        asset={assets.pdf}
        privateFile
        onView={
          assets.pdf
            ? () => openAsset(assets.pdf!.path)
            : undefined
        }
        onDelete={
          assets.pdf
            ? () => void removeAsset("pdf")
            : undefined
        }
        accept="PDF"
      />

      <div
        style={{
          border: "1px solid var(--line)",
          borderRadius: 16,
          padding: 18,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 16,
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <div>
            <h3
              style={{
                margin: 0,
                fontSize: 20,
              }}
            >
              Prévia
            </h3>

            <small
              style={{
                color: "var(--muted)",
              }}
            >
              Arquivos exibidos para apresentação do material.
            </small>
          </div>
        </div>

        {assets.previews.length === 0 ? (
          <p
            style={{
              color: "var(--muted)",
            }}
          >
            Nenhuma prévia enviada.
          </p>
        ) : (
          <div className="stack">
            {assets.previews.map((preview) => (
              <div
                key={preview.id ?? preview.path}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                  padding: 12,
                  border: "1px solid var(--line)",
                  borderRadius: 12,
                }}
              >
                <div>
                  <b>
                    {preview.filename ?? "Prévia"}
                  </b>
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap",
                  }}
                >
                  <button
                    type="button"
                    className="button"
                    onClick={() =>
                      openAsset(preview.path)
                    }
                  >
                    Visualizar
                  </button>

                  <button
                    type="button"
                    className="link"
                    onClick={() =>
                      void removeAsset(
                        "preview",
                        preview.path
                      )
                    }
                  >
                    Excluir
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <p
        style={{
          fontSize: 13,
          color: "var(--muted)",
          marginTop: 0,
        }}
      >
        PDF:{" "}
        {assets.pdf
          ? formatSize(assets.pdf.byteSize)
          : "não enviado"}
        . O acesso é temporário e exclusivo para
        administradores.
      </p>
    </div>
  );
}

function AssetCard({
  title,
  asset,
  privateFile,
  onView,
  onDelete,
  accept,
}: {
  title: string;
  asset: Asset | null;
  privateFile?: boolean;
  onView?: () => void;
  onDelete?: () => void;
  accept: string;
}) {
  return (
    <div
      style={{
        border: "1px solid var(--line)",
        borderRadius: 16,
        padding: 18,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 16,
          alignItems: "center",
        }}
      >
        <div>
          <h3
            style={{
              margin: 0,
              fontSize: 20,
            }}
          >
            {title}
          </h3>

          <small
            style={{
              color: "var(--muted)",
            }}
          >
            {privateFile
              ? "🔒 Arquivo privado"
              : accept}
          </small>

          {asset ? (
            <p
              style={{
                margin: "8px 0 0",
                fontSize: 14,
              }}
            >
              {asset.filename ?? "Arquivo enviado"}
            </p>
          ) : (
            <p
              style={{
                margin: "8px 0 0",
                color: "var(--muted)",
              }}
            >
              Nenhum arquivo enviado.
            </p>
          )}
        </div>

        {asset ? (
          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              justifyContent: "flex-end",
            }}
          >
            <button
              type="button"
              className="button"
              onClick={onView}
            >
              Visualizar
            </button>

            <button
              type="button"
              className="link"
              onClick={onDelete}
            >
              Excluir
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}