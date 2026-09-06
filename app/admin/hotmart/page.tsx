import {
  getHotmartProducts,
  type HotmartProduct,
} from "@/lib/hotmart";
import { importHotmartProducts } from "../produtos/actions";
import { HotmartImportButton } from "@/components/HotmartImportButton";
import { HotmartProductSelector } from "@/components/HotmartProductSelector";

export const dynamic = "force-dynamic";

type HotmartImportPageProps = {
  searchParams: Promise<{
    imported?: string;
    skipped?: string;
  }>;
};

export default async function HotmartImportPage({
  searchParams,
}: HotmartImportPageProps) {
  let products: HotmartProduct[] = [];
  let error = "";

  const params = await searchParams;

  const imported = Number(params.imported ?? 0);
  const skipped = Number(params.skipped ?? 0);

  try {
    const result = await getHotmartProducts();
    products = result.items;
  } catch (err) {
    error =
      err instanceof Error
        ? err.message
        : "Não foi possível consultar os produtos da Hotmart.";
  }

  return (
    <>
      <div className="section-heading">
        <div>
          <p>Integração</p>

          <h1 style={{ fontSize: 46 }}>
            Importar da Hotmart
          </h1>

          <p
            style={{
              marginTop: 10,
              color: "var(--muted)",
              maxWidth: 700,
            }}
          >
            Consulte os produtos cadastrados na Hotmart
            e selecione quais deseja trazer para o catálogo
            da Teacher Luana Marcondes.
          </p>
        </div>
      </div>

      {imported > 0 || skipped > 0 ? (
        <div
          className="panel"
          style={{
            marginTop: 24,
            marginBottom: 18,
          }}
        >
          <strong>Importação concluída</strong>

          <p style={{ marginTop: 8 }}>
            <strong>{imported}</strong>{" "}
            produto(s) importado(s).

            {skipped > 0 && (
              <>
                {" "}
                <strong>{skipped}</strong>{" "}
                produto(s) ignorado(s).
              </>
            )}
          </p>
        </div>
      ) : null}

      {error ? (
        <div
          className="panel"
          style={{
            marginTop: 24,
            borderColor: "#c94b4b",
          }}
        >
          <strong>
            Erro ao consultar a Hotmart
          </strong>

          <p style={{ marginTop: 8 }}>
            {error}
          </p>
        </div>
      ) : (
        <form action={importHotmartProducts}>
          <div
            className="panel"
            style={{
              marginTop: 24,
              marginBottom: 18,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 20,
                flexWrap: "wrap",
              }}
            >
              <div>
                <strong>
                  {products.length} produtos encontrados
                </strong>

                <p
                  style={{
                    marginTop: 6,
                    color: "var(--muted)",
                  }}
                >
                  Pesquise, selecione um ou vários
                  produtos e importe para o catálogo.
                </p>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  flexWrap: "wrap",
                }}
              >
                <span className="pill">
                  Hotmart conectada
                </span>

                <HotmartImportButton />
              </div>
            </div>
          </div>

          <HotmartProductSelector
            products={products}
          />

          <div
            style={{
              marginTop: 24,
              display: "flex",
              alignItems: "center",
              gap: 14,
              flexWrap: "wrap",
            }}
          >
            <HotmartImportButton />

            <p
              style={{
                margin: 0,
                color: "var(--muted)",
                fontSize: 14,
              }}
            >
              Os produtos serão importados como
              rascunho. Depois você poderá revisar
              preço, descrição, categorias e publicar.
            </p>
          </div>
        </form>
      )}
    </>
  );
}