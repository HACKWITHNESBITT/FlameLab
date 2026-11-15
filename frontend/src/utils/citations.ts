const TOKEN = /\[rec:[A-Za-z0-9_.-]+#[A-Za-z0-9_.]+\]/g;

/** Strip raw [rec:id#path] tokens; citations render separately as chips. */
export function stripTokens(text: string): string {
  return text.replace(TOKEN, "").replace(/\s{2,}/g, " ").trim();
}
