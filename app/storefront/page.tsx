import { ArrowLeft, Boxes, Clock, IndianRupee, PackageCheck, Store } from "lucide-react";
import Link from "next/link";

import { auth } from "@/auth";
import { getMerchantIdentityForUser } from "@/lib/merchant-identity-store";
import {
  listProductsForStorefront,
  type StoredProduct
} from "@/lib/product-inventory-store";

export const dynamic = "force-dynamic";

type StorefrontPageProps = {
  searchParams?: Promise<{
    exportId?: string;
  }>;
};

function formatQuantity(product: StoredProduct) {
  if (typeof product.quantity !== "number") return "Quantity not set";
  return `${product.quantity} ${product.unit ?? "units"}`;
}

function formatPrice(product: StoredProduct) {
  return product.price?.trim() || "Price not captured";
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(value);
}

export default async function StorefrontPage({ searchParams }: StorefrontPageProps) {
  const params = await searchParams;
  const session = await auth().catch(() => null);
  const userId = session?.user?.id ?? null;
  const exportId = typeof params?.exportId === "string" ? params.exportId : null;
  const [merchantIdentity, products] = await Promise.all([
    userId ? getMerchantIdentityForUser(userId).catch(() => null) : Promise.resolve(null),
    listProductsForStorefront({ exportId, userId }).catch(() => [])
  ]);

  const totalQuantity = products.reduce((sum, product) => sum + (product.quantity ?? 0), 0);
  const latestUpdate = products[0]?.updatedAt ?? null;
  const storeName = merchantIdentity?.storeName ?? "Your Storefront";
  const categories = new Set(products.map((product) => product.category).filter(Boolean));

  return (
    <main className="storefront-shell">
      <section className="storefront-hero" aria-labelledby="storefront-title">
        <div className="storefront-nav">
          <Link className="secondary-button" href="/">
            <ArrowLeft aria-hidden="true" size={18} />
            Home
          </Link>
          <Link className="primary-button" href="/gemini">
            <PackageCheck aria-hidden="true" size={18} />
            Update inventory
          </Link>
        </div>

        <div className="storefront-title-row">
          <div className="storefront-mark">
            <Store aria-hidden="true" size={30} />
          </div>
          <div>
            <span className="eyebrow">Live merchant storefront</span>
            <h1 id="storefront-title">{storeName}</h1>
            <p className="lede">
              {products.length
                ? "Products are loaded from the confirmed inventory saved in Supabase."
                : "No confirmed products are available yet. Capture inventory to publish this view."}
            </p>
          </div>
        </div>

        <div className="storefront-metrics" aria-label="Storefront inventory summary">
          <div>
            <span>Products</span>
            <strong>{products.length}</strong>
          </div>
          <div>
            <span>Total stock</span>
            <strong>{totalQuantity || "Open"}</strong>
          </div>
          <div>
            <span>Categories</span>
            <strong>{categories.size || "Unsorted"}</strong>
          </div>
          <div>
            <span>Last sync</span>
            <strong>{latestUpdate ? formatDate(latestUpdate) : "Pending"}</strong>
          </div>
        </div>
      </section>

      <section className="storefront-content" aria-label="Storefront products">
        {products.length ? (
          <div className="storefront-product-grid">
            {products.map((product) => (
              <article className="storefront-product" key={product.id}>
                <div className="product-topline">
                  <span>{product.category ?? "General"}</span>
                  <strong>{Math.round(product.confidence * 100)}%</strong>
                </div>
                <h2>{product.name}</h2>
                <dl className="product-details">
                  <div>
                    <dt>
                      <Boxes aria-hidden="true" size={16} />
                      Stock
                    </dt>
                    <dd>{formatQuantity(product)}</dd>
                  </div>
                  <div>
                    <dt>
                      <IndianRupee aria-hidden="true" size={16} />
                      Price
                    </dt>
                    <dd>{formatPrice(product)}</dd>
                  </div>
                  <div>
                    <dt>
                      <PackageCheck aria-hidden="true" size={16} />
                      Pack
                    </dt>
                    <dd>{product.packSize ?? "Pack size not captured"}</dd>
                  </div>
                  <div>
                    <dt>
                      <Clock aria-hidden="true" size={16} />
                      Updated
                    </dt>
                    <dd>{formatDate(product.updatedAt)}</dd>
                  </div>
                </dl>
                <div className="product-evidence">
                  <span>Visual: {product.evidenceVisual ?? "No visual evidence captured"}</span>
                  <span>Voice: {product.evidenceVoice ?? "No voice evidence captured"}</span>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="storefront-empty">
            <Store aria-hidden="true" size={38} />
            <h2>Storefront inventory is empty</h2>
            <p>Finish the voice inventory manager, then use the confirmation button to open this storefront.</p>
            <Link className="primary-button" href="/gemini">
              <PackageCheck aria-hidden="true" size={18} />
              Capture products
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
