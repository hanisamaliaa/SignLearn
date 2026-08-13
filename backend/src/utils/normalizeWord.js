export function normalizeWord(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .trim()
    .toLocaleLowerCase("id-ID")
    .replace(/\s+/g, " ");
}
