import React from "react";

type ProductCoverProps = {
  title: string;
  description?: string | null;
  category?: string | null;
  pages?: number | null;
  priceCents?: number | null;
  badge?: string | null;
  className?: string;
};

function formatPrice(priceCents?: number | null) {
  if (priceCents == null) return null;

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(priceCents / 100);
}

function getTheme(title: string, category?: string | null) {
  const text = `${title} ${category ?? ""}`.toLowerCase();

  if (/halloween|dia das bruxas|spooky/.test(text)) {
    return {
      emoji: "🎃",
      label: "HALLOWEEN",
      accent: "#7c3aed",
      background: "linear-gradient(145deg, #f5eaff 0%, #eadcff 100%)",
      decoration: "👻  🦇  🎃",
    };
  }

  if (/christmas|natal|santa/.test(text)) {
    return {
      emoji: "🎄",
      label: "CHRISTMAS",
      accent: "#dc2626",
      background: "linear-gradient(145deg, #fff1f2 0%, #fee2e2 100%)",
      decoration: "🎄  ⭐  🎁",
    };
  }

  if (/st\.?\s*patrick|patrick|irlanda|irish/.test(text)) {
    return {
      emoji: "☘️",
      label: "ST. PATRICK'S DAY",
      accent: "#15803d",
      background: "linear-gradient(145deg, #ecfdf5 0%, #dcfce7 100%)",
      decoration: "☘️  🌈  🍀",
    };
  }

  if (/food|comida|alimento|vocabul|fruits|fruit/.test(text)) {
    return {
      emoji: "🍎",
      label: "ENGLISH • VOCABULARY",
      accent: "#db2777",
      background: "linear-gradient(145deg, #fff1f7 0%, #fce7f3 100%)",
      decoration: "🍎  🍕  🍔",
    };
  }

  if (/profession|profiss|job|occupation|work/.test(text)) {
    return {
      emoji: "👩‍🏫",
      label: "ENGLISH • PROFESSIONS",
      accent: "#0284c7",
      background: "linear-gradient(145deg, #effaff 0%, #e0f2fe 100%)",
      decoration: "👩‍🏫  👨‍⚕️  👨‍🚒",
    };
  }

  if (/grammar|gramática|present|past|future|verb|tense/.test(text)) {
    return {
      emoji: "📚",
      label: "ENGLISH • GRAMMAR",
      accent: "#db2777",
      background: "linear-gradient(145deg, #fff1f7 0%, #fce7f3 100%)",
      decoration: "A + B  •  ✏️  •  📖",
    };
  }

  if (/game|jogo|quiz|puzzle|crossword|word search|activity|atividade/.test(text)) {
    return {
      emoji: "🎲",
      label: "ENGLISH • GAMES & ACTIVITIES",
      accent: "#16a34a",
      background: "linear-gradient(145deg, #effdf5 0%, #dcfce7 100%)",
      decoration: "🎲  ⭐  ✏️",
    };
  }

  if (/reading|leitura|comprehension|interpretação|text/.test(text)) {
    return {
      emoji: "📖",
      label: "ENGLISH • READING",
      accent: "#2563eb",
      background: "linear-gradient(145deg, #eff6ff 0%, #dbeafe 100%)",
      decoration: "📖  💡  ✏️",
    };
  }

  return {
    emoji: "✨",
    label: "ENGLISH • TEACHER LUANA",
    accent: "#0f766e",
    background: "linear-gradient(145deg, #ecfdf5 0%, #d1fae5 100%)",
    decoration: "⭐  ✏️  💡",
  };
}

export function ProductCover({
  title,
  description,
  category,
  pages,
  priceCents,
  badge,
  className = "",
}: ProductCoverProps) {
  const theme = getTheme(title, category);
  const price = formatPrice(priceCents);

  const shortDescription =
    description?.trim() ||
    "Material educativo pronto para usar em sala de aula.";

  return (
    <div
      className={className}
      style={{
        position: "relative",
        width: "100%",
        aspectRatio: "4 / 3",
        overflow: "hidden",
        borderRadius: 22,
        background: theme.background,
        border: "1px solid rgba(15, 118, 110, 0.12)",
        boxShadow: "0 12px 30px rgba(15, 23, 42, 0.10)",
        padding: 20,
        boxSizing: "border-box",
        color: "#073b4c",
        fontFamily: "Arial, Helvetica, sans-serif",
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          width: 150,
          height: 150,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.48)",
          top: -65,
          right: -35,
        }}
      />

      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          width: 115,
          height: 115,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.35)",
          bottom: -55,
          left: -35,
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          height: "100%",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 10,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 15,
                fontWeight: 900,
                letterSpacing: 0.4,
                color: theme.accent,
              }}
            >
              Teacher Luana
            </div>

            <div
              style={{
                fontSize: 7,
                fontWeight: 800,
                letterSpacing: 1.5,
                marginTop: 2,
                opacity: 0.72,
              }}
            >
              MATERIAIS QUE INSPIRAM
            </div>
          </div>

          {price && (
            <div
              style={{
                background: theme.accent,
                color: "#fff",
                borderRadius: 999,
                padding: "7px 11px",
                fontSize: 12,
                fontWeight: 900,
                whiteSpace: "nowrap",
                boxShadow: "0 5px 12px rgba(15,23,42,.12)",
              }}
            >
              {price}
            </div>
          )}
        </div>

        <div
          style={{
            marginTop: 14,
            alignSelf: "flex-start",
            background: "rgba(255,255,255,.78)",
            color: theme.accent,
            borderRadius: 999,
            padding: "5px 9px",
            fontSize: 8,
            fontWeight: 900,
            letterSpacing: 0.7,
          }}
        >
          {theme.emoji} {theme.label}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            marginTop: 12,
          }}
        >
          <div
            style={{
              width: 68,
              height: 68,
              minWidth: 68,
              borderRadius: 20,
              background: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 38,
              boxShadow: "0 8px 18px rgba(15,23,42,.08)",
              transform: "rotate(-3deg)",
            }}
          >
            {theme.emoji}
          </div>

          <div
            style={{
              fontSize: 14,
              fontWeight: 800,
              opacity: 0.75,
              lineHeight: 1.25,
            }}
          >
            {theme.decoration}
          </div>
        </div>

        <h2
          style={{
            margin: "12px 0 5px",
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontSize: "clamp(22px, 4vw, 34px)",
            lineHeight: 0.98,
            letterSpacing: -0.8,
            color: "#063b4b",
            overflowWrap: "anywhere",
          }}
        >
          {title}
        </h2>

        <p
          style={{
            margin: 0,
            fontSize: 11,
            lineHeight: 1.35,
            maxWidth: "92%",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            opacity: 0.82,
          }}
        >
          {shortDescription}
        </p>

        <div
          style={{
            marginTop: "auto",
            display: "flex",
            flexWrap: "wrap",
            gap: 6,
          }}
        >
          <span
            style={{
              background: "#fff",
              borderRadius: 999,
              padding: "5px 8px",
              fontSize: 8,
              fontWeight: 900,
            }}
          >
            PDF
          </span>

          <span
            style={{
              background: "#fff",
              borderRadius: 999,
              padding: "5px 8px",
              fontSize: 8,
              fontWeight: 900,
            }}
          >
            Pronto para imprimir
          </span>

          {badge && (
            <span
              style={{
                background: theme.accent,
                color: "#fff",
                borderRadius: 999,
                padding: "5px 8px",
                fontSize: 8,
                fontWeight: 900,
              }}
            >
              {badge}
            </span>
          )}
        </div>

        <div
          style={{
            marginTop: 9,
            fontSize: 8,
            fontWeight: 800,
            opacity: 0.65,
          }}
        >
          Learn • Practice • Have Fun! ✨
        </div>
      </div>
    </div>
  );
}

export default ProductCover;
