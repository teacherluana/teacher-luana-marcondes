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

const accepts: Record<AssetKind, string> = {
  pdf: "application/pdf",
  cover: "image/png,image/jpeg,image/webp",
  preview: "image/png,image/jpeg,image/webp",
};

const maxFileSize = 20 * 1024 * 1024;

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
  const [uploading, setUploading] = useState<AssetKind | null>(null);
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

      setAssets(result as AssetsResponse);
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

  async function uploadAsset(
    file: File,
    kind: AssetKind,
    replacePath?: string
  ) {
    if (file.size > maxFileSize) {
      setMessage("O arquivo deve ter até 20 MB.");
      return;
    }

    setUploading(kind);
    setMessage("Preparando upload...");

    try {
      /*
       * 1. Solicita ao servidor autorização para enviar
       *    o arquivo diretamente ao Storage privado.
       */
      const authorization = await fetch(
        "/api/admin/upload-url",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            productId,
            kind,
            filename: file.name,
            contentType: file.type,
          }),
        }
      );

      const auth = (await authorization.json()) as {
        path?: string;
        token?: string;
        signedUrl?: string;
        error?: string;
      };

      if (
        !authorization.ok ||
        !auth.path ||
        !auth.signedUrl
      ) {
        throw new Error(
          auth.error ??
            "Não foi possível autorizar o upload."
        );
      }

      /*
       * 2. Envia o arquivo para o Supabase Storage.
       */
      setMessage("Enviando arquivo...");

      const sent = await fetch(auth.signedUrl, {
        method: "PUT",
        headers: {
          "Content-Type": file.type,
          "x-upsert": "true",
        },
        body: file,
      });

      if (!sent.ok) {
        throw new Error("O upload falhou.");
      }

      /*
       * 3. Calcula o checksum.
       */
      const hash = await crypto.subtle.digest(
        "SHA-256",
        await file.arrayBuffer()
      );

      const checksum = Array.from(
        new Uint8Array(hash)
      )
        .map((value) =>
          value.toString(16).padStart(2, "0")
        )
        .join("");

      /*
       * 4. Se estamos substituindo um arquivo existente,
       *    usamos o endpoint de substituição.
       */
      if (replacePath) {
        setMessage("Substituindo arquivo anterior...");

        const replacement = await fetch(
          "/api/admin/assets/replace",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              productId,
              kind,
              oldPath: replacePath,
              path: auth.path,
              filename: file.name,
              mimeType: file.type,
              byteSize: file.size,
              checksum,
            }),
          }
        );

        const replacementResult =
          (await replacement.json()) as ApiError;

        if (!replacement.ok) {
          throw new Error(
            replacementResult.error ??
              "Não foi possível substituir o arquivo."
          );
        }
      } else {
        /*
         * 5. Primeiro upload de um arquivo.
         */
        setMessage("Registrando arquivo...");

        const saved = await fetch(
          "/api/admin/assets",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              productId,
              kind,
              path: auth.path,
              filename: file.name,
              mimeType: file.type,
              byteSize: file.size,
              checksum,
            }),
          }
        );

        const result =
          (await saved.json()) as ApiError;

        if (!saved.ok) {
          throw new Error(
            result.error ??
              "O arquivo foi enviado, mas não foi registrado."
          );
        }
      }

      setMessage("Arquivo enviado com sucesso.");

      await loadAssets();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível enviar o arquivo."
      );
    } finally {
      setUploading(null);
    }
  }

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
      const response = await fetch(
        "/api/admin/assets",
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            productId,
            kind,
            path,
          }),
        }
      );

      const result =
        (await response.json()) as ApiError;

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
      `/api/admin/assets/view?path=${encodeURIComponent(
        path
      )}`,
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

    return `${(
      bytes /
      1024 /
      1024
    ).toFixed(1)} MB`;
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

      {/* CAPA */}
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
        uploading={uploading === "cover"}
        onUpload={(file) =>
          void uploadAsset(
            file,
            "cover",
            assets.cover?.path
          )
        }
      />

      {/* PDF */}
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
        uploading={uploading === "pdf"}
        onUpload={(file) =>
          void uploadAsset(
            file,
            "pdf",
            assets.pdf?.path
          )
        }
      />

      {/* PRÉVIAS */}
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
              Arquivos exibidos para apresentação do
              material.
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
                key={
                  preview.id ?? preview.path
                }
                style={{
                  display: "flex",
                  justifyContent:
                    "space-between",
                  alignItems: "center",
                  gap: 12,
                  padding: 12,
                  border:
                    "1px solid var(--line)",
                  borderRadius: 12,
                }}
              >
                <div>
                  <b>
                    {preview.filename ??
                      "Prévia"}
                  </b>

                  {preview.byteSize ? (
                    <small
                      style={{
                        display: "block",
                        color:
                          "var(--muted)",
                        marginTop: 4,
                      }}
                    >
                      {formatSize(
                        preview.byteSize
                      )}
                    </small>
                  ) : null}
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
                      openAsset(
                        preview.path
                      )
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

        <div style={{ marginTop: 18 }}>
          <label
            style={{
              display: "grid",
              gap: 6,
              fontWeight: 800,
              fontSize: 14,
            }}
          >
            Adicionar nova prévia

            <input
              className="input"
              type="file"
              accept={accepts.preview}
              disabled={uploading === "preview"}
              onChange={(event) => {
                const file =
                  event.target.files?.[0];

                if (file) {
                  void uploadAsset(
                    file,
                    "preview"
                  );
                }

                event.target.value = "";
              }}
            />

            <small
              style={{
                color: "var(--muted)",
              }}
            >
              {uploading === "preview"
                ? "Enviando prévia..."
                : "PNG, JPG ou WEBP. Máximo 20 MB."}
            </small>
          </label>
        </div>
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
          ? formatSize(
              assets.pdf.byteSize
            )
          : "não enviado"}
        . O acesso é temporário e exclusivo
        para administradores.
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
  uploading,
  onUpload,
}: {
  title: string;
  asset: Asset | null;
  privateFile?: boolean;
  onView?: () => void;
  onDelete?: () => void;
  accept: string;
  uploading?: boolean;
  onUpload: (file: File) => void;
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
              {asset.filename ??
                "Arquivo enviado"}

              {asset.byteSize ? (
                <span
                  style={{
                    color: "var(--muted)",
                    marginLeft: 8,
                  }}
                >
                  ({formatSizeStatic(
                    asset.byteSize
                  )})
                </span>
              ) : null}
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

      <div
        style={{
          marginTop: 16,
          paddingTop: 16,
          borderTop: "1px solid var(--line)",
        }}
      >
        <label
          style={{
            display: "grid",
            gap: 6,
            fontWeight: 800,
            fontSize: 14,
          }}
        >
          {asset
            ? `Substituir ${title.toLowerCase()}`
            : `Adicionar ${title.toLowerCase()}`}

          <input
            className="input"
            type="file"
            accept={
              title === "PDF completo"
                ? accepts.pdf
                : accepts.cover
            }
            disabled={uploading}
            onChange={(event) => {
              const file =
                event.target.files?.[0];

              if (file) {
                onUpload(file);
              }

              event.target.value = "";
            }}
          />

          <small
            style={{
              color: "var(--muted)",
            }}
          >
            {uploading
              ? "Enviando arquivo..."
              : title === "PDF completo"
              ? "PDF. Máximo 20 MB."
              : "PNG, JPG ou WEBP. Máximo 20 MB."}
          </small>
        </label>
      </div>
    </div>
  );
}

function formatSizeStatic(bytes?: number) {
  if (!bytes) {
    return "";
  }

  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }

  return `${(
    bytes /
    1024 /
    1024
  ).toFixed(1)} MB`;
}