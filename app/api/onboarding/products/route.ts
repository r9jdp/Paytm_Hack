import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { replaceProductsForExport } from "@/lib/product-inventory-store";
import type { InventoryItem } from "@/lib/types";

export const runtime = "nodejs";

type ProductsBody = {
  exportId?: unknown;
  products?: unknown;
};

function isInventoryItem(value: unknown): value is InventoryItem {
  if (!value || typeof value !== "object") return false;

  const item = value as Partial<InventoryItem>;
  return (
    typeof item.id === "string" &&
    typeof item.name === "string" &&
    typeof item.confidence === "number" &&
    Boolean(item.evidence) &&
    typeof item.evidence === "object"
  );
}

function parseBody(body: ProductsBody | null):
  | {
      exportId: string;
      products: InventoryItem[];
    }
  | { error: string } {
  const exportId = typeof body?.exportId === "string" ? body.exportId.trim() : "";
  if (!exportId) {
    return { error: "exportId is required." };
  }

  if (!Array.isArray(body?.products)) {
    return { error: "products must be an array." };
  }

  const products = body.products.filter(isInventoryItem);
  if (!products.length) {
    return { error: "At least one product is required." };
  }

  return { exportId, products };
}

export async function POST(request: Request) {
  const session = await auth();
  const body = (await request.json().catch(() => null)) as ProductsBody | null;
  const parsed = parseBody(body);

  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const result = await replaceProductsForExport({
      exportId: parsed.exportId,
      products: parsed.products,
      userId: session?.user?.id ?? null
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save products.";
    console.error("/api/onboarding/products failed:", message);

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
