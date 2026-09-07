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

  if (/halloween|dia das bruxas|spooky/.test(text))
    return { emoji: "🎃", label: "HALLOWEEN", accent: "#7c3aed", soft: "#f3e8ff", decoration: "👻  🦇  🎃" };

  if (/christmas|natal|santa/.test(text))
    return { emoji: "🎄", label: "CHRISTMAS", accent: "#dc2626", soft: "#fee2e2", decoration: "🎄  ⭐  🎁" };

  if (/st\.?\s*patrick|patrick|irlanda|irish/.test(text))
    return { emoji: "☘️", label: "ST. PATRICK'S DAY", accent: "#15803d", soft: "#dcfce7", decoration: "☘️  🌈  🍀" };

  if (/food|comida|alimento|vocabul|fruits|fruit/.test(text))
    return { emoji: "🍎", label: "VOCABULARY", accent: "#db2777", soft: "#fce7f3", decoration: "🍎  🍕  🍔" };

  if (/profession|profiss|job|occupation|work/.test(text))
    return { emoji: "👩‍🏫", label: "ENGLISH • PROFESSIONS", accent: "#0284c7", soft: "#e0f2fe", decoration: "👩‍🏫  👨‍⚕️  👨‍🚒" };

  if (/grammar|gramática|present|past|future|verb|tense/.test(text))
    return { emoji: "📚", label: "ENGLISH • GRAMMAR", accent: "#db2777", soft: "#fce7f3", decoration: "A + B  •  ✏️  •  📖" };

  if (/game|jogo|quiz|puzzle|crossword|word search|activity|atividade/.test(text))
    return { emoji: "🎲", label: "ENGLISH • GAMES & ACTIVITIES", accent: "#16a34a", soft: "#dcfce7", decoration: "🎲  ⭐  ✏️" };

  if (/reading|leitura|comprehension|interpretação|text/.test(text))
    return { emoji: "📖", label: "ENGLISH • READING", accent: "#2563eb", soft: "#dbeafe", decoration: "📖  💡  ✏️" };

  return { emoji: "✨", label: "ENGLISH • TEACHER LUANA", accent: "#2563eb", soft: "#dbeafe", decoration: "⭐  ✏️  💡" };
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
    "Material educativo pronto para usar em sala de aula ou em casa.";

  return (
    <div
      className={`product-cover ${className}`}
      style={{
        ["--cover-accent" as string]: theme.accent,
        ["--cover-soft" as string]: theme.soft,
      }}
    >
      <div className="product-cover__blob product-cover__blob--one" />
      <div className="product-cover__blob product-cover__blob--two" />

      <div className="product-cover__top">
        <div className="product-cover__brand">
          <span className="product-cover__brand-name">Teacher Luana</span>
          <span className="product-cover__brand-subtitle">
            MATERIAIS QUE INSPIRAM
          </span>
        </div>
        {price && <div className="product-cover__price">{price}</div>}
      </div>

      <div className="product-cover__theme">
        <span>{theme.emoji}</span>
        {theme.label}
      </div>

      <div className="product-cover__art">
        <div className="product-cover__circle">
          <span>{theme.emoji}</span>
        </div>
        <div className="product-cover__decorations">{theme.decoration}</div>
      </div>

      <div className="product-cover__content">
        <h2>{title}</h2>
        <p>{shortDescription}</p>

        <div className="product-cover__chips">
          <span>PDF</span>
          {pages ? <span>{pages} páginas</span> : <span>Pronto para imprimir</span>}
          <span>Para sala de aula</span>
        </div>
      </div>

      <div className="product-cover__bottom">
        <span>Learn • Practice • Have Fun!</span>
        {badge && <strong>{badge}</strong>}
      </div>
    </div>
  );
}

export default ProductCover;
