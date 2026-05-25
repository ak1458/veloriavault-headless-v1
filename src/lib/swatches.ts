import type { WCAttribute, WCAttributeTerm, WCProduct } from "@/lib/woocommerce";

export interface ColorSwatch {
  /** Display name of the color, e.g. "Freya Black" */
  name: string;
  /** Short label suitable for tooltips, e.g. "Black" */
  label: string;
  /** Term slug used as `attribute_pa_color` query value, e.g. "freya-black" */
  slug: string;
  /** CSS color string used to paint the swatch circle */
  hex: string;
  /** Relative URL pointing to the variation product page */
  href: string;
}

// Common color word → hex mapping. Order doesn't matter, but compound colors
// (e.g. "chocolate brown", "teal green") must be defined alongside the simple
// variants because `extractColorHex` will try the longest match first.
const COLOR_HEX_MAP: Record<string, string> = {
  black: "#1a1a1a",
  white: "#fafafa",
  brown: "#6f4e37",
  "chocolate brown": "#3e2723",
  camel: "#c19a6b",
  tan: "#d2b48c",
  beige: "#d8c9a3",
  cherry: "#9b1c2e",
  red: "#b22222",
  burgundy: "#5d1a1a",
  maroon: "#5d1a1a",
  green: "#4f7942",
  olive: "#6b7a3a",
  "teal green": "#1f6f6a",
  teal: "#1f6f6a",
  yellow: "#d4a017",
  gold: "#caa33d",
  blue: "#27496d",
  navy: "#1c2541",
  pink: "#d8a7b1",
  rose: "#c08081",
  grey: "#808080",
  gray: "#808080",
  silver: "#c0c0c0",
  // Common typos seen in catalogue
  charry: "#9b1c2e",
};

const COLOR_KEYS_LONGEST_FIRST = Object.keys(COLOR_HEX_MAP).sort(
  (a, b) => b.length - a.length,
);

function extractColorHex(termName: string): string {
  const lower = termName.toLowerCase().trim();

  // Try the longest defined key that appears in the term name
  for (const key of COLOR_KEYS_LONGEST_FIRST) {
    if (lower === key || lower.endsWith(` ${key}`) || lower.includes(` ${key} `)) {
      return COLOR_HEX_MAP[key];
    }
  }

  // Last word fallback
  const words = lower.split(/\s+/);
  const lastWord = words[words.length - 1];
  if (lastWord && COLOR_HEX_MAP[lastWord]) {
    return COLOR_HEX_MAP[lastWord];
  }

  return "#cccccc";
}

function extractColorLabel(termName: string, productName?: string): string {
  if (!productName) {
    return termName;
  }

  const productWords = productName
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word && word !== "the" && word !== "a");

  let label = termName;
  for (const word of productWords) {
    const re = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "ig");
    label = label.replace(re, "");
  }
  return label.replace(/\s+/g, " ").trim() || termName;
}

function findColorAttribute(product: WCProduct): WCAttribute | undefined {
  return product.attributes.find(
    (attr) =>
      attr.slug === "pa_color" ||
      attr.name?.toLowerCase().includes("color") ||
      attr.name?.toLowerCase().includes("colour"),
  );
}

/**
 * Build a list of color swatches for a product. Returns an empty array when
 * the product has no color attribute or no terms with slugs (e.g. when the
 * product is a single variation rather than a parent).
 */
export function getProductColorSwatches(product: WCProduct): ColorSwatch[] {
  const colorAttr = findColorAttribute(product);
  if (!colorAttr) {
    return [];
  }

  const terms: WCAttributeTerm[] = colorAttr.terms?.length
    ? colorAttr.terms
    : (colorAttr.options ?? []).map((name) => ({
        name,
        slug: name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, ""),
      }));

  if (!terms.length) {
    return [];
  }

  return terms.map((term) => ({
    name: term.name,
    label: extractColorLabel(term.name, product.name),
    slug: term.slug,
    hex: extractColorHex(term.name),
    href: `/product/${product.slug}?attribute_pa_color=${encodeURIComponent(term.slug)}`,
  }));
}
