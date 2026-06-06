"use client";

import type { Session } from "next-auth";
import { useSession } from "next-auth/react";
import {
  Camera,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Download,
  LogIn,
  LogOut,
  RefreshCw,
  ScanLine,
  ShoppingBag,
  Store
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { signInWithGoogle, signOutUser } from "@/app/actions";
import type { AppRole } from "@/lib/roles";

type HomeScreenProps = {
  session: Session | null;
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
    description: "Counter operations, product capture, and assisted checkout.",
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
    title: "Merchant counter",
    eyebrow: "Merchant mode",
    description: "Accept payments, stage products, and keep the counter moving.",
    actions: [
      {
        icon: CircleDollarSign,
        title: "Payment desk",
        description: "UPI-ready checkout surface for counter flows."
      },
      {
        icon: Camera,
        title: "Product camera",
        description: "A clean camera zone for visual assistance."
      },
      {
        icon: CheckCircle2,
        title: "Order signals",
        description: "Status tiles for pending, paid, and packed orders."
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

export function HomeScreen({ session: initialSession }: HomeScreenProps) {
  const { data: clientSession, update } = useSession();
  const session = clientSession ?? initialSession;
  const router = useRouter();
  const [pendingRole, setPendingRole] = useState<AppRole | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone] = useState(() => {
    if (typeof window === "undefined") return false;

    const iosNavigator = navigator as Navigator & { standalone?: boolean };
    return window.matchMedia("(display-mode: standalone)").matches || Boolean(iosNavigator.standalone);
  });
  const [isPending, startTransition] = useTransition();

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
    setPendingRole(role);
    setError(null);

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
                Role onboarding
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

              {session.user.role ? (
                <RoleWorkspace role={session.user.role} />
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

function RoleWorkspace({ role }: { role: AppRole }) {
  const surface = roleSurfaces[role];

  return (
    <div className="role-workspace">
      <div className="status-board">
        <div>
          <p className="panel-title">You are set up.</p>
          <p className="panel-copy">Your selected role is stored with your account.</p>
        </div>
        <div className="status-item">
          <span className="status-label">Current role</span>
          <span className="status-value">{role}</span>
        </div>
      </div>

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

        <div className="vision-frame" aria-label="Realtime vision workspace">
          <div className="vision-frame-copy">
            <Camera aria-hidden="true" size={28} />
            <span>Realtime vision</span>
          </div>
          {role === "merchant" ? (
            <Link className="primary-button" href="/gemini_live">
              <ScanLine aria-hidden="true" size={18} />
              Start shop scan
            </Link>
          ) : (
            <span className="surface-chip pending">
              <RefreshCw aria-hidden="true" size={14} />
              Merchant scan only
            </span>
          )}
        </div>
      </section>
    </div>
  );
}
