export async function loadSpectorDevOnly(): Promise<unknown> {
  return import("spectorjs");
}
