export async function loadSpectorConstructorFound(): Promise<boolean> {
  const spectorModule = await import("spectorjs");
  const moduleValue = spectorModule as {
    default?: { SPECTOR?: { Spector?: new () => unknown } };
    SPECTOR?: { Spector?: new () => unknown };
  };

  return typeof moduleValue.SPECTOR?.Spector === "function" || typeof moduleValue.default?.SPECTOR?.Spector === "function";
}
