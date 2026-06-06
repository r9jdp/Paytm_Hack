import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { upsertMerchantIdentity } from "@/lib/merchant-identity-store";
import {
  isMerchantBusinessType,
  isMerchantFulfillmentType,
  type MerchantBusinessType,
  type MerchantFulfillmentType
} from "@/lib/merchant-options";

type MerchantOnboardingBody = {
  storeName?: unknown;
  businessType?: unknown;
  storeTimings?: unknown;
  fulfillmentType?: unknown;
  deliveryRadiusKm?: unknown;
  minimumOrderValue?: unknown;
};

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as MerchantOnboardingBody | null;
  const parsed = parseMerchantOnboarding(body);

  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const merchantIdentity = await upsertMerchantIdentity(session.user.id, parsed.input);

  return NextResponse.json({
    role: "merchant",
    merchantIdentity
  });
}

function parseMerchantOnboarding(body: MerchantOnboardingBody | null):
  | {
      input: {
        storeName: string;
        businessType: MerchantBusinessType;
        storeTimings: string;
        fulfillmentType: MerchantFulfillmentType;
        deliveryRadiusKm: number;
        minimumOrderValue: number;
      };
    }
  | { error: string } {
  const storeName = typeof body?.storeName === "string" ? body.storeName.trim() : "";
  const storeTimings =
    typeof body?.storeTimings === "string" ? body.storeTimings.trim() : "";
  const businessType = body?.businessType;
  const fulfillmentType = body?.fulfillmentType;
  const deliveryRadiusKm = Number(body?.deliveryRadiusKm);
  const minimumOrderValue = Number(body?.minimumOrderValue);

  if (storeName.length < 2) {
    return { error: "Store name is required." };
  }

  if (!isMerchantBusinessType(businessType)) {
    return { error: "Choose a valid business type." };
  }

  if (storeTimings.length < 3) {
    return { error: "Store timings are required." };
  }

  if (!isMerchantFulfillmentType(fulfillmentType)) {
    return { error: "Choose a valid fulfillment type." };
  }

  if (!Number.isFinite(deliveryRadiusKm) || deliveryRadiusKm < 0) {
    return { error: "Delivery radius must be zero or more." };
  }

  if (!Number.isFinite(minimumOrderValue) || minimumOrderValue < 0) {
    return { error: "Minimum order value must be zero or more." };
  }

  return {
    input: {
      storeName,
      businessType,
      storeTimings,
      fulfillmentType,
      deliveryRadiusKm,
      minimumOrderValue: Math.round(minimumOrderValue)
    }
  };
}
