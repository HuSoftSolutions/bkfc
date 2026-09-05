/**
 * Normalize an environment variable value that may have been pasted with
 * surrounding whitespace or a literal "\\n" sequence at the end.
 */
export function cleanEnvValue(value: string | undefined): string {
  if (!value) return "";
  return value.replace(/\\n$/g, "").replace(/\r?\n$/g, "").trim();
}
