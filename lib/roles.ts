export const appRoles = ["buyer", "merchant"] as const;

export type AppRole = (typeof appRoles)[number];

export function isAppRole(value: unknown): value is AppRole {
  return typeof value === "string" && appRoles.includes(value as AppRole);
}

export function toPrismaRole(role: AppRole) {
  return role === "merchant" ? "MERCHANT" : "BUYER";
}

export function fromPrismaRole(role?: string | null): AppRole | undefined {
  if (role === "MERCHANT") return "merchant";
  if (role === "BUYER") return "buyer";
  return undefined;
}
