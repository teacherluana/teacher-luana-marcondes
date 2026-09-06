import type { CSSProperties } from "react";

const colors = [
  {
    name: "mint",
    background:
      "linear-gradient(135deg, #dff5ed 0%, #b8e5d6 100%)",
    accent: "#124c4b",
  },
  {
    name: "peach",
    background:
      "linear-gradient(135deg, #fff0e5 0%, #f8cdb5 100%)",
    accent: "#8a4935",
  },
  {
    name: "lavender",
    background:
      "linear-gradient(135deg, #eee8fa 0%, #d5c7ef 100%)",
    accent: "#594477",
  },
  {
    name: "sky",
    background:
      "linear-gradient(135deg, #e5f3fa 0%, #bcddec 100%)",
    accent: "#24566d",
  },
];

function formatTitle(title: string) {
  const words = title
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length <= 4) {
    return [words.join(" ")];
  }

  const middle = Math.ceil(words.length / 2);

  return [
    words.slice(0, middle).join(" "),
    words.slice(middle).join(" "),
  ];
}

export function ProductVisual({
  title,
  index = 0,
  coverUrl,
  variant = "card",
}: {
  title: string;
  index?: number;
  coverUrl?: string | null;
  variant?: "card" | "detail";
}) {
  const theme = colors[index % colors.length];
  const titleLines = formatTitle(title);

  /*
   * Quando existe uma capa real, mostramos a imagem
   * limpa, sem sobrepor os textos da identidade visual.
   */
  if (coverUrl) {
    return (
      <div
        className="product-art"
        style={{
          minHeight:
            variant === "detail" ? 330 : undefined,
          borderRadius:
            variant === "detail" ? 26 : undefined,
          backgroundImage: `url(${coverUrl})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      />
    );
  }

  /*
   * Quando não existe capa, usamos a identidade
   * visual automática do catálogo.
   */
  const style: CSSProperties = {
    background: theme.background,
    color: theme.accent,
  };

  return (
    <div
      className={`product-art ${theme.name}`}
      style={{
        ...style,
        ...(variant === "detail"
          ? {
              minHeight: 330,
              borderRadius: 26,
            }
          : {}),
      }}
    >
      <span className="badge">
        {variant === "detail"
          ? "Atividade digital"
          : "Pronto para brincar"}
      </span>

      <div>
        <small>ENGLISH FUN</small>

        <h3
          style={
            variant === "detail"
              ? {
                  fontSize:
                    "clamp(44px, 6vw, 72px)",
                }
              : undefined
          }
        >
          {titleLines.map((line, lineIndex) => (
            <span
              key={`${line}-${lineIndex}`}
              style={{
                display: "block",
              }}
            >
              {line}
            </span>
          ))}
        </h3>
      </div>

      <small>
        {variant === "detail"
          ? "PRONTO PARA IMPRIMIR ✂"
          : "DIGITAL PRINTABLE ✂"}
      </small>
    </div>
  );
}