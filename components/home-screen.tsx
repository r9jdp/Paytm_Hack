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
  Download,
  LogIn,
  LogOut,
  MapPin,
  Phone,
  RefreshCw,
  ScanLine,
  ShoppingBag,
  Store,
  Truck
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
import type { AppRole } from "@/lib/roles";

type HomeScreenProps = {
  session: Session | null;
  merchantDefaults: MerchantIdentityDefaults | null;
  merchantIdentity: MerchantIdentitySummary | null;
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

const roleOptions: Array<{
  role: AppRole;
  title: string;
  description: string;
  icon: LucideIcon;
}> = [
  {
    role: "merchant",
    title: "Merchant",
    description: "Open Point & Ask AI for camera-based product help.",
    icon: Store
  },
  {
    role: "buyer",
    title: "Buyer",
    description: "Scan-led shopping, context, and a fast payment handoff.",
    icon: ShoppingBag
  }
];

const roleSurfaces = {
  merchant: {
    title: "Point & Ask AI",
    eyebrow: "Merchant mode",
    description: "Use the working camera assistant to ask questions about products, shelves, labels, and menus.",
    actions: [
      {
        icon: Camera,
        title: "Live camera",
        description: "Point at any product, shelf, receipt, label, or menu."
      },
      {
        icon: ScanLine,
        title: "Ask by voice or text",
        description: "Ask what you see, read text, or extract product details."
      },
      {
        icon: CheckCircle2,
        title: "Local history",
        description: "Answers and thumbnails are stored locally for quick review."
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

export function HomeScreen({
  session: initialSession,
  merchantDefaults,
  merchantIdentity
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

    if (role === "merchant") {
      startTransition(() => router.push("/gemini"));
    } else {
      startTransition(() => router.refresh());
    }

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
            <p className="eyebrow">PWA now, realtime vision-ready later</p>
            <h1>Google sign-in for merchants and buyers.</h1>
            <p className="lede">
              Paytm Vision starts with secure account access and role onboarding, then leaves a
              clean camera surface ready for OpenAI Realtime vision.
            </p>
            <ul className="feature-row" aria-label="App features">
              <li>
                <CheckCircle2 aria-hidden="true" size={17} />
                Installable PWA
              </li>
              <li>
                <CheckCircle2 aria-hidden="true" size={17} />
                Google OAuth
              </li>
              <li>
                <CheckCircle2 aria-hidden="true" size={17} />
                Merchant onboarding
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
                  role={session.user.role}
                />
              ) : (
                <>
                  <div>
                    <p className="panel-title">Choose your mode.</p>
                    <p className="panel-copy">Paytm opens the matching workspace after Google login.</p>
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
                <p className="panel-title">Sign in to continue.</p>
                <p className="panel-copy">After Google login, the app asks whether you are a buyer or merchant.</p>
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
              ? "Store name, business type, phone, and Mumbai location are saved to your merchant profile."
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
  merchantIdentity
}: {
  role: AppRole;
  merchantIdentity: MerchantIdentitySummary | null;
}) {
  const surface = roleSurfaces[role];

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
        <div className="merchant-summary" aria-label="Merchant identity">
          <div className="summary-item">
            <span className="status-label">Store</span>
            <span className="status-value">{merchantIdentity.storeName}</span>
          </div>
          <div className="summary-item">
            <span className="status-label">Business</span>
            <span className="status-value">
              {merchantBusinessTypeLabels[merchantIdentity.businessType]}
            </span>
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

        <div className="vision-frame" aria-label="Point and Ask AI workspace">
          <div className="vision-frame-copy">
            <Camera aria-hidden="true" size={28} />
            <span>Point & Ask AI</span>
          </div>
          {role === "merchant" ? (
            <Link className="primary-button" href="/gemini">
              <ScanLine aria-hidden="true" size={18} />
              Open Point & Ask AI
            </Link>
          ) : (
            <span className="surface-chip pending">
              <RefreshCw aria-hidden="true" size={14} />
              Merchant camera assistant only
            </span>
          )}
        </div>
      </section>
    </div>
  );
}
