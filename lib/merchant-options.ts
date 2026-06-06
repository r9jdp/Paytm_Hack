export const merchantBusinessTypes = [
  "kirana",
  "restaurant",
  "pharmacy",
  "salon",
  "electronics",
  "stationery",
  "fashion",
  "services",
  "other"
] as const;

export type MerchantBusinessType = (typeof merchantBusinessTypes)[number];

export const merchantBusinessTypeLabels = {
  kirana: "Kirana",
  restaurant: "Restaurant",
  pharmacy: "Pharmacy",
  salon: "Salon",
  electronics: "Electronics",
  stationery: "Stationery",
  fashion: "Fashion",
  services: "Services",
  other: "Other"
} satisfies Record<MerchantBusinessType, string>;

export const merchantFulfillmentTypes = ["pickup_only", "delivery_only", "both"] as const;

export type MerchantFulfillmentType = (typeof merchantFulfillmentTypes)[number];

export const merchantFulfillmentTypeLabels = {
  pickup_only: "Pickup only",
  delivery_only: "Delivery only",
  both: "Both"
} satisfies Record<MerchantFulfillmentType, string>;

export type MerchantIdentityDefaults = {
  phoneNumber: string;
  gpsLocation: string;
  gpsLatitude: string;
  gpsLongitude: string;
  city: string;
  pincode: string;
};

export type MerchantIdentitySummary = MerchantIdentityDefaults & {
  storeName: string;
  businessType: MerchantBusinessType;
  storeTimings: string;
  fulfillmentType: MerchantFulfillmentType;
  deliveryRadiusKm: string;
  minimumOrderValue: number;
};

export const dummyMumbaiLocation = {
  gpsLocation: "19.076000, 72.877700",
  gpsLatitude: "19.076000",
  gpsLongitude: "72.877700",
  city: "Mumbai",
  pincode: "400001"
} as const;

export function isMerchantBusinessType(value: unknown): value is MerchantBusinessType {
  return (
    typeof value === "string" &&
    merchantBusinessTypes.includes(value as MerchantBusinessType)
  );
}

export function isMerchantFulfillmentType(value: unknown): value is MerchantFulfillmentType {
  return (
    typeof value === "string" &&
    merchantFulfillmentTypes.includes(value as MerchantFulfillmentType)
  );
}

export function buildMerchantIdentityDefaults(userId: string): MerchantIdentityDefaults {
  const hash = Array.from(userId).reduce((total, character) => {
    return (total * 31 + character.charCodeAt(0)) % 1_000_000_000;
  }, 7);
  const phoneDigits = `9${hash.toString().padStart(9, "0")}`;

  return {
    phoneNumber: `+91 ${phoneDigits.slice(0, 5)} ${phoneDigits.slice(5)}`,
    ...dummyMumbaiLocation
  };
}
