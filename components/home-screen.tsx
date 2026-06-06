"use client";

import type { Session } from "next-auth";
import { useSession } from "next-auth/react";
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Clock,
  CreditCard,
  Download,
  Landmark,
  LoaderCircle,
  LogIn,
  LogOut,
  MapPin,
  Minus,
  PackageSearch,
  Receipt,
  Phone,
  Plus,
  QrCode,
  RefreshCw,
  ScanLine,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Smartphone,
  Store,
  Route,
  Truck,
  Wallet,
  X
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState, useTransition } from "react";

import { signInWithGoogle, signOutUser } from "@/app/actions";
import {
  merchantBusinessTypeLabels,
  merchantBusinessTypes,
  merchantFulfillmentTypeLabels,
  merchantFulfillmentTypes,
  type MerchantBusinessType,
  type MerchantFulfillmentType,
  type MerchantIdentityDefaults,
  type MerchantIdentitySummary
} from "@/lib/merchant-options";
import type { MerchantSellerSummary } from "@/lib/merchant-identity-store";
import type { AppRole } from "@/lib/roles";

type HomeScreenProps = {
  session: Session | null;
  merchantDefaults: MerchantIdentityDefaults | null;
  merchantIdentity: MerchantIdentitySummary | null;
  merchantSellers: MerchantSellerSummary[];
};

type MerchantOnboardingPayload = {
  storeName: string;
  businessType: MerchantBusinessType;
  storeTimings: string;
  fulfillmentType: MerchantFulfillmentType;
  deliveryRadiusKm: number;
  minimumOrderValue: number;
};

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

type SellerProduct = MerchantSellerSummary["products"][number];
type PaymentMethod = "upi" | "wallet" | "card" | "netbanking";
type PaymentStatus = "idle" | "processing" | "success";

const roleOptions: Array<{
  role: AppRole;
  title: string;
  description: string;
  blurb: string;
  icon: LucideIcon;
}> = [
  {
    role: "merchant",
    title: "Merchant",
    description: "Start voice-led product inventory onboarding.",
    blurb: "From shelf scan to storefront-ready records with one workflow.",
    icon: Store
  },
  {
    role: "buyer",
    title: "Buyer",
    description: "Scan-led shopping, context, and a fast payment handoff.",
    blurb: "Browse nearby merchants, compare products, and complete a quick checkout.",
    icon: ShoppingBag
  }
];

const roleSurfaces = {
  merchant: {
    title: "Voice merchant onboarding",
    eyebrow: "Merchant mode",
    description: "Use one camera and voice flow to capture product inventory and a local storefront JSON.",
    actions: [
      {
        icon: Camera,
        title: "Live video frame",
        description: "Start once, then show products in the guided camera view."
      },
      {
        icon: ScanLine,
        title: "Voice-led capture",
        description: "The assistant prompts you, listens for quantities, and advances automatically."
      },
      {
        icon: CheckCircle2,
        title: "Local export",
        description: "Inventory, transcripts, and thumbnails stay in this browser."
      }
    ]
  },
  buyer: {
    title: "Buyer checkout",
    eyebrow: "Buyer mode",
    description: "Scan, compare, ask, and pay from one pocket-friendly flow.",
    actions: [
      {
        icon: ScanLine,
        title: "Scan cart",
        description: "A direct path into item and bill recognition."
      },
      {
        icon: ShoppingBag,
        title: "Shop context",
        description: "Buyer-first cards for price, product, and merchant details."
      },
      {
        icon: CircleDollarSign,
        title: "Pay ready",
        description: "A focused payment handoff when checkout is confirmed."
      }
    ]
  }
} satisfies Record<
  AppRole,
  {
    title: string;
    eyebrow: string;
    description: string;
    actions: Array<{ icon: LucideIcon; title: string; description: string }>;
  }
>;

const merchantHomeHighlights = [
  {
    icon: Store,
    title: "Store first",
    detail: "Keep identity and location details ready for all captures."
  },
  {
    icon: Route,
    title: "Delivery settings",
    detail: "Set fulfillment radius and minimum order to reduce order churn."
  },
  {
    icon: ShieldCheck,
    title: "Trust trail",
    detail: "Capture transcripts and proof with each inventory session."
  }
];

const buyerHomeHighlights = [
  {
    icon: Receipt,
    title: "Review before pay",
    detail: "Compare totals in one place before you simulate payment."
  },
  {
    icon: Sparkles,
    title: "Fast discovery",
    detail: "Jump between nearby stores and inspect product packs quickly."
  },
  {
    icon: CircleDollarSign,
    title: "Instant handoff",
    detail: "Pick UPI, wallet, card, or bank and complete in one step."
  }
];

const paymentMethods: Array<{
  id: PaymentMethod;
  label: string;
  detail: string;
  icon: LucideIcon;
}> = [
  {
    id: "upi",
    label: "UPI",
    detail: "paytmupi",
    icon: QrCode
  },
  {
    id: "wallet",
    label: "Wallet",
    detail: "Balance ready",
    icon: Wallet
  },
  {
    id: "card",
    label: "Card",
    detail: "Visa ending 4242",
    icon: CreditCard
  },
  {
    id: "netbanking",
    label: "Netbanking",
    detail: "All banks",
    icon: Landmark
  }
];

export function HomeScreen({
  session: initialSession,
  merchantDefaults,
  merchantIdentity,
  merchantSellers
}: HomeScreenProps) {
  const { data: clientSession, update } = useSession();
  const session = clientSession ?? initialSession;
  const router = useRouter();
  const [pendingRole, setPendingRole] = useState<AppRole | null>(null);
  const [submittedMerchantIdentity, setSubmittedMerchantIdentity] =
    useState<MerchantIdentitySummary | null>(null);
  const [isMerchantOnboarding, setIsMerchantOnboarding] = useState(false);
  const [isMerchantSubmitting, setIsMerchantSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [merchantError, setMerchantError] = useState<string | null>(null);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone] = useState(() => {
    if (typeof window === "undefined") return false;

    const iosNavigator = navigator as Navigator & { standalone?: boolean };
    return window.matchMedia("(display-mode: standalone)").matches || Boolean(iosNavigator.standalone);
  });
  const [isPending, startTransition] = useTransition();

  const effectiveMerchantIdentity = submittedMerchantIdentity ?? merchantIdentity;
  const needsMerchantOnboarding =
    session?.user?.role === "merchant" && !effectiveMerchantIdentity && Boolean(merchantDefaults);
  const showMerchantOnboarding = Boolean(
    session?.user && merchantDefaults && (isMerchantOnboarding || needsMerchantOnboarding)
  );

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  async function chooseRole(role: AppRole) {
    setError(null);

    if (role === "merchant") {
      setMerchantError(null);
      setIsMerchantOnboarding(true);
      return;
    }

    setPendingRole(role);

    const response = await fetch("/api/role", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ role })
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(payload?.error ?? "Could not save your role.");
      setPendingRole(null);
      return;
    }

    await update({ role });
    startTransition(() => router.refresh());
    setPendingRole(null);
  }

  async function completeMerchantOnboarding(payload: MerchantOnboardingPayload) {
    setMerchantError(null);
    setIsMerchantSubmitting(true);

    try {
      const response = await fetch("/api/merchant-onboarding", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const result = (await response.json().catch(() => null)) as {
        error?: string;
        merchantIdentity?: MerchantIdentitySummary;
        role?: AppRole;
      } | null;

      if (!response.ok || !result?.merchantIdentity) {
        setMerchantError(result?.error ?? "Could not save merchant onboarding.");
        return;
      }

      setSubmittedMerchantIdentity(result.merchantIdentity);
      await update({ role: "merchant" });
      setIsMerchantOnboarding(false);
      startTransition(() => router.refresh());
    } catch {
      setMerchantError("Could not save merchant onboarding.");
    } finally {
      setIsMerchantSubmitting(false);
    }
  }

  async function installApp() {
    if (!installPrompt) {
      return;
    }

    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand" aria-label="Paytm Vision PWA">
          <span className="brand-mark">
            <ScanLine aria-hidden="true" size={22} />
          </span>
          <span className="brand-text">Paytm Vision</span>
        </div>
        <div className="topbar-actions">
          {session?.user ? (
            <Link className="secondary-button" href="/storefront">
              <Store aria-hidden="true" size={16} />
              Your storefront
            </Link>
          ) : null}
          {installPrompt && !isStandalone ? (
            <button className="secondary-button" type="button" onClick={installApp}>
              <Download aria-hidden="true" size={18} />
              Install
            </button>
          ) : null}
          {session?.user ? (
            <form action={signOutUser}>
              <button className="secondary-button" type="submit">
                <LogOut aria-hidden="true" size={18} />
                Sign out
              </button>
            </form>
          ) : null}
        </div>
      </header>

      <main className="main">
        <section className="workspace">
          <div className="hero-copy">
            <p className="eyebrow">Role based product workflow</p>
            <h1>Onboard merchants and shoppers in one place.</h1>
            <p className="lede">
              Sign in, set your role, and move straight into capture, discovery, or checkout.
            </p>
            <ul className="feature-row" aria-label="App features">
              <li>
                <CheckCircle2 aria-hidden="true" size={17} />
                Installable PWA
              </li>
              <li>
                <CheckCircle2 aria-hidden="true" size={17} />
                Google sign-in
              </li>
              <li>
                <CheckCircle2 aria-hidden="true" size={17} />
                Merchant onboarding
              </li>
              <li>
                <CheckCircle2 aria-hidden="true" size={17} />
                Buyer storefront browsing
              </li>
            </ul>
          </div>

          {session?.user ? (
            <section className="panel" aria-label="Role setup">
              <div className="user-row">
                {session.user.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="avatar" src={session.user.image} alt="" />
                ) : (
                  <span className="avatar" aria-hidden="true" />
                )}
                <div className="user-meta">
                  <p className="user-name">{session.user.name ?? "Signed in user"}</p>
                  <p className="user-email">{session.user.email}</p>
                </div>
              </div>

              {showMerchantOnboarding && merchantDefaults ? (
                <MerchantOnboarding
                  canGoBack={!session.user.role}
                  defaults={merchantDefaults}
                  error={merchantError}
                  isSubmitting={isMerchantSubmitting}
                  onBack={() => setIsMerchantOnboarding(false)}
                  onSubmit={completeMerchantOnboarding}
                />
              ) : session.user.role ? (
                <RoleWorkspace
                  merchantIdentity={effectiveMerchantIdentity}
                  merchantSellers={merchantSellers}
                  role={session.user.role}
                />
              ) : (
                <>
                  <div>
                    <p className="panel-title">Choose your mode</p>
                    <p className="panel-copy">
                      Pick the role and jump directly into the workflow that matches your next action.
                    </p>
                  </div>
                  <div className="role-grid">
                    {roleOptions.map((option) => {
                      const Icon = option.icon;

                      return (
                        <button
                          className="role-button"
                          disabled={Boolean(pendingRole) || isPending}
                          key={option.role}
                          onClick={() => chooseRole(option.role)}
                          type="button"
                        >
                          <span className={`role-icon ${option.role}`}>
                            <Icon aria-hidden="true" size={22} />
                          </span>
                          <span>
                            <span className="role-title">
                              {pendingRole === option.role ? "Saving..." : option.title}
                            </span>
                            <span className="role-copy">{option.description}</span>
                            <span className="role-copy role-copy-subtle">{option.blurb}</span>
                          </span>
                          <ChevronRight aria-hidden="true" size={18} />
                        </button>
                      );
                    })}
                  </div>
                  {error ? <p className="error">{error}</p> : null}
                </>
              )}
            </section>
          ) : (
            <section className="panel" aria-label="Sign in">
              <div>
                <p className="panel-title">Sign in to continue</p>
                <p className="panel-copy">
                  After Google login, the app asks whether you are a buyer or merchant.
                </p>
              </div>
              <form action={signInWithGoogle}>
                <button className="primary-button" type="submit">
                  <LogIn aria-hidden="true" size={18} />
                  Continue with Google
                </button>
              </form>
              <p className="helper">Role selection appears immediately after the first authenticated session.</p>
            </section>
          )}
        </section>
      </main>
    </div>
  );
}

function MerchantOnboarding({
  canGoBack,
  defaults,
  error,
  isSubmitting,
  onBack,
  onSubmit
}: {
  canGoBack: boolean;
  defaults: MerchantIdentityDefaults;
  error: string | null;
  isSubmitting: boolean;
  onBack: () => void;
  onSubmit: (payload: MerchantOnboardingPayload) => Promise<void>;
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [storeName, setStoreName] = useState("");
  const [businessType, setBusinessType] = useState<MerchantBusinessType>("kirana");
  const [storeTimings, setStoreTimings] = useState("8 AM - 10 PM");
  const [fulfillmentType, setFulfillmentType] = useState<MerchantFulfillmentType>("both");
  const [deliveryRadiusKm, setDeliveryRadiusKm] = useState("3");
  const [minimumOrderValue, setMinimumOrderValue] = useState("100");
  const isStoreStepComplete = storeName.trim().length >= 2;

  async function submitOnboarding(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (step === 1) {
      if (isStoreStepComplete) {
        setStep(2);
      }

      return;
    }

    await onSubmit({
      storeName: storeName.trim(),
      businessType,
      storeTimings: storeTimings.trim(),
      fulfillmentType,
      deliveryRadiusKm: Number(deliveryRadiusKm),
      minimumOrderValue: Number(minimumOrderValue)
    });
  }

  return (
    <form className="merchant-onboarding" onSubmit={submitOnboarding}>
      <div className="onboarding-header">
        <span className="surface-chip">Merchant setup</span>
        <div>
          <p className="panel-title">
            {step === 1 ? "Create your store identity." : "Store operations"}
          </p>
          <p className="panel-copy">
            {step === 1
              ? "Store name, business type, phone, and location are saved to your merchant profile."
              : "Buyers will use these details for pickup, delivery, and order planning."}
          </p>
        </div>
      </div>

      {step === 1 ? (
        <>
          <label className="field">
            <span>Store Name</span>
            <input
              autoFocus
              onChange={(event) => setStoreName(event.target.value)}
              placeholder="Enter store name"
              required
              value={storeName}
            />
          </label>

          <div className="field">
            <span>What type of business do you run?</span>
            <div className="choice-grid" role="radiogroup" aria-label="Business type">
              {merchantBusinessTypes.map((type) => (
                <button
                  aria-checked={businessType === type}
                  className={`choice-button ${businessType === type ? "selected" : ""}`}
                  key={type}
                  onClick={() => setBusinessType(type)}
                  role="radio"
                  type="button"
                >
                  {merchantBusinessTypeLabels[type]}
                </button>
              ))}
            </div>
          </div>

          <div className="readonly-grid">
            <label className="field">
              <span>
                <Phone aria-hidden="true" size={16} />
                Phone Number
              </span>
              <input readOnly value={defaults.phoneNumber} />
            </label>
            <label className="field">
              <span>
                <MapPin aria-hidden="true" size={16} />
                GPS Location
              </span>
              <input readOnly value={defaults.gpsLocation} />
            </label>
            <label className="field">
              <span>City</span>
              <input readOnly value={defaults.city} />
            </label>
            <label className="field">
              <span>Pincode</span>
              <input readOnly value={defaults.pincode} />
            </label>
          </div>
        </>
      ) : (
        <>
          <label className="field">
            <span>
              <Clock aria-hidden="true" size={16} />
              Store Timings
            </span>
            <input
              onChange={(event) => setStoreTimings(event.target.value)}
              placeholder="8 AM - 10 PM"
              required
              value={storeTimings}
            />
          </label>

          <div className="field">
            <span>
              <Truck aria-hidden="true" size={16} />
              Fulfillment Type
            </span>
            <div className="choice-grid compact" role="radiogroup" aria-label="Fulfillment type">
              {merchantFulfillmentTypes.map((type) => (
                <button
                  aria-checked={fulfillmentType === type}
                  className={`choice-button ${fulfillmentType === type ? "selected" : ""}`}
                  key={type}
                  onClick={() => setFulfillmentType(type)}
                  role="radio"
                  type="button"
                >
                  {merchantFulfillmentTypeLabels[type]}
                </button>
              ))}
            </div>
          </div>

          <div className="form-grid">
            <label className="field">
              <span>Delivery Radius</span>
              <input
                min="0"
                onChange={(event) => setDeliveryRadiusKm(event.target.value)}
                placeholder="3"
                required
                step="0.5"
                type="number"
                value={deliveryRadiusKm}
              />
            </label>
            <label className="field">
              <span>Minimum Order</span>
              <input
                min="0"
                onChange={(event) => setMinimumOrderValue(event.target.value)}
                placeholder="100"
                required
                step="1"
                type="number"
                value={minimumOrderValue}
              />
            </label>
          </div>
        </>
      )}

      {error ? <p className="error">{error}</p> : null}

      <div className="form-actions">
        {step === 2 ? (
          <button className="secondary-button" type="button" onClick={() => setStep(1)}>
            <ArrowLeft aria-hidden="true" size={18} />
            Store details
          </button>
        ) : canGoBack ? (
          <button className="secondary-button" type="button" onClick={onBack}>
            <ArrowLeft aria-hidden="true" size={18} />
            Role choice
          </button>
        ) : null}

        <button
          className="primary-button"
          disabled={isSubmitting || (step === 1 && !isStoreStepComplete)}
          type="submit"
        >
          {step === 1 ? "Next" : isSubmitting ? "Saving..." : "Finish onboarding"}
          <ChevronRight aria-hidden="true" size={18} />
        </button>
      </div>
    </form>
  );
}

function RoleWorkspace({
  role,
  merchantIdentity,
  merchantSellers
}: {
  role: AppRole;
  merchantIdentity: MerchantIdentitySummary | null;
  merchantSellers: MerchantSellerSummary[];
}) {
  const surface = roleSurfaces[role];

  if (role === "buyer") {
    return <BuyerMarketplace sellers={merchantSellers} />;
  }

  return (
    <div className="role-workspace">
      <div className="status-board">
        <div>
          <p className="panel-title">You are set up.</p>
          <p className="panel-copy">
            {role === "merchant" && merchantIdentity
              ? "Your merchant identity and store operations are stored with your account."
              : "Your selected role is stored with your account."}
          </p>
        </div>
        <div className="status-item">
          <span className="status-label">Current role</span>
          <span className="status-value">{role}</span>
        </div>
      </div>

      {role === "merchant" && merchantIdentity ? (
        <>
          <div className="merchant-summary" aria-label="Merchant identity">
            <div className="summary-item">
              <span className="status-label">Store</span>
              <span className="status-value">{merchantIdentity.storeName}</span>
            </div>
            <div className="summary-item">
              <span className="status-label">Business</span>
              <span className="status-value">{merchantBusinessTypeLabels[merchantIdentity.businessType]}</span>
            </div>
            <div className="summary-item">
              <span className="status-label">Timings</span>
              <span className="status-value">{merchantIdentity.storeTimings}</span>
            </div>
            <div className="summary-item">
              <span className="status-label">Fulfillment</span>
              <span className="status-value">
                {merchantFulfillmentTypeLabels[merchantIdentity.fulfillmentType]}
              </span>
            </div>
            <div className="summary-item">
              <span className="status-label">Delivery</span>
              <span className="status-value">{merchantIdentity.deliveryRadiusKm} km</span>
            </div>
            <div className="summary-item">
              <span className="status-label">Minimum order</span>
              <span className="status-value">Rs.{merchantIdentity.minimumOrderValue}</span>
            </div>
            <div className="summary-item">
              <span className="status-label">Phone</span>
              <span className="status-value">{merchantIdentity.phoneNumber}</span>
            </div>
            <div className="summary-item">
              <span className="status-label">Location</span>
              <span className="status-value">
                {merchantIdentity.city} {merchantIdentity.pincode}
              </span>
            </div>
          </div>

          <section className="merchant-highlight-grid" aria-label="Merchant quick home setup">
            {merchantHomeHighlights.map((highlight) => {
              const Icon = highlight.icon;

              return (
                <article className="merchant-highlight" key={highlight.title}>
                  <span>
                    <Icon aria-hidden="true" size={16} />
                  </span>
                  <div>
                    <h3>{highlight.title}</h3>
                    <p>{highlight.detail}</p>
                  </div>
                </article>
              );
            })}
          </section>
        </>
      ) : null}

      {role === "buyer" ? (
        <section className="buyer-highlight-grid" aria-label="Buyer home snapshot">
          {buyerHomeHighlights.map((highlight) => {
            const Icon = highlight.icon;

            return (
              <article className="buyer-highlight" key={highlight.title}>
                <span>
                  <Icon aria-hidden="true" size={16} />
                </span>
                <div>
                  <h3>{highlight.title}</h3>
                  <p>{highlight.detail}</p>
                </div>
              </article>
            );
          })}
        </section>
      ) : null}

      <section className="role-surface" aria-label={`${surface.title} workspace`}>
        <div className="role-surface-header">
          <span className="surface-chip">{surface.eyebrow}</span>
          <h2>{surface.title}</h2>
          <p>{surface.description}</p>
        </div>

        <div className="surface-actions">
          {surface.actions.map((action) => {
            const Icon = action.icon;

            return (
              <article className="surface-action" key={action.title}>
                <Icon aria-hidden="true" size={20} />
                <div>
                  <h3>{action.title}</h3>
                  <p>{action.description}</p>
                </div>
              </article>
            );
          })}
        </div>

        <div className="vision-frame" aria-label="Voice merchant onboarding workspace">
          <div className="vision-frame-copy">
            <Camera aria-hidden="true" size={28} />
            <span>Voice merchant onboarding</span>
          </div>
          {role === "merchant" ? (
            <Link className="primary-button" href="/gemini">
              <ScanLine aria-hidden="true" size={18} />
              Start onboarding
            </Link>
          ) : (
            <span className="surface-chip pending">
              <RefreshCw aria-hidden="true" size={14} />
              Merchant onboarding only
            </span>
          )}
        </div>
      </section>
    </div>
  );
}

function BuyerMarketplace({ sellers }: { sellers: MerchantSellerSummary[] }) {
  const [selectedSeller, setSelectedSeller] = useState<MerchantSellerSummary | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<SellerProduct | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("upi");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("idle");
  const [paymentReference, setPaymentReference] = useState("");
  const [upiHandle, setUpiHandle] = useState("rajdeepvp273-1@oksbi");
  const [bookingMessage, setBookingMessage] = useState<string | null>(null);
  const products = selectedSeller?.products ?? [];
  const unitPrice = selectedProduct ? getProductUnitPrice(selectedProduct) : null;
  const total = unitPrice === null ? null : unitPrice * quantity;
  const paymentAmount = total === null ? null : formatMoney(total);

  useEffect(() => {
    if (!isPaymentOpen || paymentStatus !== "processing" || !selectedSeller || !selectedProduct) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setPaymentStatus("success");
      setBookingMessage(
        `Payment successful at ${selectedSeller.storeName}: ${quantity} x ${selectedProduct.name} for ${
          total === null ? "store-confirmed pricing" : `Rs.${formatMoney(total)}`
        }. Ref ${paymentReference}.`
      );
    }, 1500);

    return () => window.clearTimeout(timer);
  }, [
    isPaymentOpen,
    paymentReference,
    paymentStatus,
    quantity,
    selectedProduct,
    selectedSeller,
    total
  ]);

  function openSeller(seller: MerchantSellerSummary) {
    setSelectedSeller(seller);
    setSelectedProduct(null);
    setQuantity(1);
    closePaymentGateway();
    setBookingMessage(null);
  }

  function openProduct(product: SellerProduct) {
    setSelectedProduct(product);
    setQuantity(1);
    closePaymentGateway();
    setBookingMessage(null);
  }

  function openPaymentGateway() {
    if (!selectedSeller || !selectedProduct) return;

    setPaymentReference(createPaymentReference());
    setPaymentStatus("idle");
    setIsPaymentOpen(true);
    setBookingMessage(null);
  }

  function closePaymentGateway() {
    setIsPaymentOpen(false);
    setPaymentStatus("idle");
  }

  function completePayment() {
    if (!selectedSeller || !selectedProduct || paymentStatus !== "idle") return;

    setPaymentStatus("processing");
  }

  return (
    <div className="buyer-marketplace">
      <div className="status-board">
        <div>
          <p className="panel-title">Nearby sellers</p>
          <p className="panel-copy">
            Sellers and products are loaded from the merchant database.
          </p>
        </div>
        <div className="status-item">
          <span className="status-label">Current role</span>
          <span className="status-value">buyer</span>
        </div>
      </div>

      {!selectedSeller ? (
        <div className="seller-list">
          {sellers.length > 0 ? (
            sellers.map((seller) => (
              <button
                className="seller-card"
                key={seller.userId}
                onClick={() => openSeller(seller)}
                type="button"
              >
                <span className="seller-icon">
                  <Store aria-hidden="true" size={20} />
                </span>
                <span>
                  <span className="role-title">{seller.storeName}</span>
                  <span className="role-copy">
                    {merchantBusinessTypeLabels[seller.businessType]} - {seller.city} {seller.pincode}
                  </span>
                  <span className="role-copy">
                    {seller.storeTimings} - {merchantFulfillmentTypeLabels[seller.fulfillmentType]}
                  </span>
                  <span className="role-copy">{seller.products.length} products</span>
                </span>
                <ChevronRight aria-hidden="true" size={18} />
              </button>
            ))
          ) : (
            <p className="helper">No sellers found yet.</p>
          )}
        </div>
      ) : (
        <>
          <div className="store-heading">
            <button
              className="secondary-button"
              onClick={() => {
                setSelectedSeller(null);
                setSelectedProduct(null);
                closePaymentGateway();
                setBookingMessage(null);
              }}
              type="button"
            >
              <ArrowLeft aria-hidden="true" size={18} />
              Sellers
            </button>
            <div>
              <p className="panel-title">{selectedSeller.storeName}</p>
              <p className="panel-copy">
                {merchantBusinessTypeLabels[selectedSeller.businessType]} - Min order Rs.
                {selectedSeller.minimumOrderValue}
              </p>
            </div>
          </div>

          {products.length ? (
            <div className="product-grid">
              {products.map((product) => (
                <button
                  className={`product-card ${selectedProduct?.id === product.id ? "selected" : ""}`}
                  key={product.id}
                  onClick={() => openProduct(product)}
                  type="button"
                >
                  <PackageSearch aria-hidden="true" size={20} />
                  <span>
                    <span className="role-title">{product.name}</span>
                    <span className="role-copy">{getProductDescription(product)}</span>
                    <span className="product-price">{formatProductPrice(product)}</span>
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="helper">No products found for this seller.</p>
          )}

          {selectedProduct ? (
            <div className="booking-panel">
              <div>
                <p className="panel-title">{selectedProduct.name}</p>
                <p className="panel-copy">{getProductDescription(selectedProduct)}</p>
              </div>
              <div className="quantity-row">
                <button
                  className="icon-button"
                  onClick={() => {
                    setQuantity((current) => Math.max(1, current - 1));
                    closePaymentGateway();
                    setBookingMessage(null);
                  }}
                  type="button"
                  aria-label="Decrease quantity"
                >
                  <Minus aria-hidden="true" size={18} />
                </button>
                <span className="quantity-value">{quantity}</span>
                <button
                  className="icon-button"
                  onClick={() => {
                    setQuantity((current) => current + 1);
                    closePaymentGateway();
                    setBookingMessage(null);
                  }}
                  type="button"
                  aria-label="Increase quantity"
                >
                  <Plus aria-hidden="true" size={18} />
                </button>
              </div>
              <div className="status-item">
                <span className="status-label">Total</span>
                <span className="status-value">
                  {total === null ? "Confirm at store" : `Rs.${formatMoney(total)}`}
                </span>
              </div>
              <button className="primary-button" onClick={openPaymentGateway} type="button">
                <CreditCard aria-hidden="true" size={18} />
                Buy now
              </button>
              {bookingMessage ? <p className="success-message">{bookingMessage}</p> : null}
            </div>
          ) : null}

          {isPaymentOpen && selectedSeller && selectedProduct ? (
            <PaymentGatewayModal
              amount={paymentAmount}
              method={paymentMethod}
              onClose={closePaymentGateway}
              onMethodChange={setPaymentMethod}
              onPay={completePayment}
              product={selectedProduct}
              quantity={quantity}
              reference={paymentReference}
              seller={selectedSeller}
              status={paymentStatus}
              upiHandle={upiHandle}
              onUpiHandleChange={setUpiHandle}
            />
          ) : null}
        </>
      )}
    </div>
  );
}

function PaymentGatewayModal({
  amount,
  method,
  onClose,
  onMethodChange,
  onPay,
  onUpiHandleChange,
  product,
  quantity,
  reference,
  seller,
  status,
  upiHandle
}: {
  amount: string | null;
  method: PaymentMethod;
  onClose: () => void;
  onMethodChange: (method: PaymentMethod) => void;
  onPay: () => void;
  onUpiHandleChange: (value: string) => void;
  product: SellerProduct;
  quantity: number;
  reference: string;
  seller: MerchantSellerSummary;
  status: PaymentStatus;
  upiHandle: string;
}) {
  const selectedMethod = paymentMethods.find((item) => item.id === method) ?? paymentMethods[0];
  const SelectedIcon = selectedMethod.icon;
  const payableAmount = amount ? `Rs.${amount}` : "Confirm at store";
  const canPay = Boolean(amount) && status === "idle";

  return (
    <div className="payment-overlay" role="presentation">
      <div
        aria-labelledby="payment-title"
        aria-modal="true"
        className="payment-sheet"
        role="dialog"
      >
        <div className="payment-brandbar">
          <div className="payment-brand">
            <span className="payment-logo" aria-hidden="true">
              <span>Pay</span>
              <span>tm</span>
            </span>
          </div>
          <button
            aria-label="Close payment gateway"
            className="payment-close"
            disabled={status === "processing"}
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" size={18} />
          </button>
        </div>

        <div className="payment-body">
          <section className="payment-summary" aria-label="Order summary">
            <div>
              <p className="payment-label">Paying to</p>
              <h2 id="payment-title">{seller.storeName}</h2>
              <p className="payment-muted">
                {quantity} x {product.name}
              </p>
            </div>
            <div className="payment-amount">
              <span>Amount</span>
              <strong>{payableAmount}</strong>
            </div>
          </section>

          <section className="payment-methods" aria-label="Payment methods">
            {paymentMethods.map((item) => {
              const Icon = item.icon;
              const isSelected = method === item.id;

              return (
                <button
                  aria-pressed={isSelected}
                  className={`payment-method ${isSelected ? "selected" : ""}`}
                  disabled={status !== "idle"}
                  key={item.id}
                  onClick={() => onMethodChange(item.id)}
                  type="button"
                >
                  <Icon aria-hidden="true" size={18} />
                  <span>
                    <strong>{item.label}</strong>
                    <small>{item.detail}</small>
                  </span>
                </button>
              );
            })}
          </section>

          <section className="payment-instrument" aria-label="Selected payment instrument">
            {status === "success" ? (
              <div className="payment-success">
                <span className="payment-success-icon">
                  <CheckCircle2 aria-hidden="true" size={28} />
                </span>
                <div>
                  <p className="payment-label">Payment successful</p>
                  <strong>{reference}</strong>
                </div>
              </div>
            ) : (
              <>
                <div className="payment-instrument-head">
                  <span className="payment-instrument-icon">
                    <SelectedIcon aria-hidden="true" size={22} />
                  </span>
                  <div>
                    <p className="payment-label">{selectedMethod.label}</p>
                    <strong>{getPaymentMethodTitle(method)}</strong>
                  </div>
                </div>

                {method === "upi" ? (
                  <div className="payment-upi-grid">
                    <div className="payment-qr" aria-hidden="true">
                      <span />
                      <span />
                      <span />
                      <span />
                    </div>
                    <label className="payment-field">
                      <span>UPI ID</span>
                      <input
                        disabled={status !== "idle"}
                        onChange={(event) => onUpiHandleChange(event.target.value)}
                        value={upiHandle}
                      />
                    </label>
                  </div>
                ) : (
                  <div className="payment-token-card">
                    <span>{getPaymentMethodPrimaryLine(method)}</span>
                    <strong>{getPaymentMethodSecondaryLine(method)}</strong>
                  </div>
                )}

                <div className="payment-security-row">
                  <ShieldCheck aria-hidden="true" size={16} />
                  <span>Secured with Paytm authentication</span>
                </div>
              </>
            )}
          </section>

          <div className="payment-actions">
            <button
              className="secondary-button"
              disabled={status === "processing"}
              onClick={onClose}
              type="button"
            >
              {status === "success" ? "Close" : "Cancel"}
            </button>
            <button
              className="payment-pay-button"
              disabled={!canPay}
              onClick={onPay}
              type="button"
            >
              {status === "processing" ? (
                <>
                  <LoaderCircle aria-hidden="true" className="payment-spinner" size={18} />
                  Processing
                </>
              ) : status === "success" ? (
                <>
                  <CheckCircle2 aria-hidden="true" size={18} />
                  Paid
                </>
              ) : amount ? (
                <>
                  <Smartphone aria-hidden="true" size={18} />
                  Pay Rs.{amount}
                </>
              ) : (
                "Amount unavailable"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function getProductDescription(product: SellerProduct) {
  const quantity =
    typeof product.quantity === "number"
      ? `${formatMoney(product.quantity)}${product.unit ? ` ${product.unit}` : ""} available`
      : null;
  const details = [product.category, product.packSize, quantity].filter(Boolean);

  return details.length ? details.join(" - ") : "Merchant product";
}

function formatProductPrice(product: SellerProduct) {
  const price = product.price?.trim();
  const unit = product.unit?.trim();

  if (!price) {
    return "Price unavailable";
  }

  return unit ? `${price} / ${unit}` : price;
}

function getProductUnitPrice(product: SellerProduct) {
  const price = product.price?.trim();
  if (!price) return null;

  const currencyMatch = price.match(/(?:rs\.?|inr|\u20b9)\s*([0-9]+(?:\.[0-9]+)?)/i);
  const fallbackMatch = price.match(/([0-9]+(?:\.[0-9]+)?)/);
  const amount = currencyMatch?.[1] ?? fallbackMatch?.[1];

  return amount ? Number(amount) : null;
}

function formatMoney(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.?0+$/, "");
}

function getPaymentMethodTitle(method: PaymentMethod) {
  if (method === "upi") return "Scan or approve UPI collect";
  if (method === "wallet") return "Paytm wallet balance";
  if (method === "card") return "Saved card";
  return "Bank authentication";
}

function getPaymentMethodPrimaryLine(method: PaymentMethod) {
  if (method === "wallet") return "Available wallet balance";
  if (method === "card") return "Saved Visa card";
  return "Preferred bank";
}

function getPaymentMethodSecondaryLine(method: PaymentMethod) {
  if (method === "wallet") return "Rs.12,450";
  if (method === "card") return "**** **** **** 4242";
  return "HDFC Bank";
}

function createPaymentReference() {
  return `PTM${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 90 + 10)}`;
}
