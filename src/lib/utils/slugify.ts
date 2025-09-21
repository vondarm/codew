const MAX_SLUG_LENGTH = 64;

export function slugify(input: string): string {
  const normalized = input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized.slice(0, MAX_SLUG_LENGTH);
}

export function withSlugFallback(slug: string): string {
  if (slug.length >= 3) {
    return slug;
  }

  const base = slug.length > 0 ? `${slug}-workspace` : "workspace";
  return base.slice(0, MAX_SLUG_LENGTH);
}
