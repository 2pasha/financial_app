import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { SignedIn, SignedOut, UserButton } from "@clerk/clerk-react";
import { CheckCircle2, LayoutGrid, Plane } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";

// Category palette — the real COLOR_OPTIONS hexes from AddCategoryDialog.tsx.
const COLORS = {
  green: "#22c55e",
  orange: "#f97316",
  purple: "#6366f1",
  pink: "#ec4899",
  yellow: "#eab308",
};

// The dark-navy gradient from the reference mockups (#030213 is --primary).
const NAVY_GRADIENT = "linear-gradient(315deg, #030213 0%, #232350 100%)";

// Subtle scroll-in reveal; respects prefers-reduced-motion.
function Reveal({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setShown(true);
            observer.disconnect();
          }
        });
      },
      { threshold: 0.15 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${
        shown ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      } ${className}`}
    >
      {children}
    </div>
  );
}

// Small square color swatch (matches the category dot style used across the app).
function Dot({ color, className = "" }: { color: string; className?: string }) {
  return (
    <span
      className={`inline-block w-2.5 h-2.5 rounded-sm shrink-0 ${className}`}
      style={{ backgroundColor: color }}
    />
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* 1. Nav */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
        <nav className="max-w-6xl mx-auto px-4 py-3 sm:px-6 lg:px-8 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2" aria-label="Moneta home">
            <img src="/favicon.png" alt="Moneta" className="w-8 h-8 coin-logo" />
            <span className="text-lg font-semibold text-foreground">Moneta</span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <SignedOut>
              <Button asChild variant="outline">
                <Link to="/sign-in">Sign in</Link>
              </Button>
              <Button asChild>
                <Link to="/sign-up">Sign up free</Link>
              </Button>
            </SignedOut>
            <SignedIn>
              <Button asChild variant="outline">
                <Link to="/app">Back to app</Link>
              </Button>
              <UserButton afterSignOutUrl="/" />
            </SignedIn>
          </div>
        </nav>
      </header>

      <main>
        {/* 2. Hero */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="grid md:grid-cols-2 gap-12 md:gap-8 items-center">
            <Reveal>
              <p className="text-sm font-semibold tracking-widest uppercase text-muted-foreground">
                Personal budgeting, made simple
              </p>
              <h1 className="mt-4 text-4xl sm:text-5xl font-bold tracking-tight text-foreground">
                Know where your money's going — before it's gone.
              </h1>
              <p className="mt-6 text-lg text-muted-foreground max-w-xl">
                Automatic budgeting from your Monobank transactions — see what's safe to spend
                before you spend it.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button asChild size="lg">
                  <Link to="/sign-up">Sign up free</Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link to="/sign-in">Sign in</Link>
                </Button>
              </div>
            </Reveal>

            {/* Hero visual — floating card */}
            <Reveal>
              <Card className="shadow-xl transition-shadow hover:shadow-2xl">
                <CardContent className="p-4 sm:p-6">
                  <div
                    className="rounded-xl p-5 sm:p-6 text-primary-foreground"
                    style={{ background: NAVY_GRADIENT }}
                  >
                    <p className="text-sm opacity-80">Safe to spend</p>
                    <p className="mt-1 text-3xl sm:text-4xl font-bold">₴35,634.65</p>
                    <div className="mt-4 h-2 w-full rounded-full overflow-hidden bg-primary-foreground/20">
                      <div className="h-full rounded-full bg-primary-foreground" style={{ width: "78%" }} />
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    {[
                      { name: "Groceries", sub: "₴4,200 left", color: COLORS.green },
                      { name: "Entertainment", sub: "₴600 left", color: COLORS.orange },
                      { name: "Transport", sub: "₴1,100 left", color: COLORS.purple },
                      { name: "Rent", sub: "Paid", color: COLORS.pink },
                    ].map((chip) => (
                      <div key={chip.name} className="rounded-lg bg-muted p-3">
                        <div className="flex items-center gap-2">
                          <Dot color={chip.color} />
                          <span className="text-sm font-semibold text-foreground">{chip.name}</span>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">{chip.sub}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </Reveal>
          </div>
        </section>

        {/* 3. Plan — copy left, card right */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="grid md:grid-cols-2 gap-12 md:gap-8 items-center">
            <Reveal>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
                Tell your money where to go
              </h2>
              <p className="mt-4 text-lg text-muted-foreground max-w-xl">
                Set your income, allocate it across categories, and know exactly what's safe to
                spend — before the month even starts.
              </p>
            </Reveal>

            <Reveal>
              <Card className="shadow-lg transition-shadow hover:shadow-xl">
                <CardContent className="p-5 sm:p-6">
                  <p className="text-sm text-muted-foreground">Left to allocate — July 2026</p>
                  <p className="mt-1 text-3xl font-bold text-foreground">₴2,641.00</p>
                  <div className="mt-4 border-t border-border" />
                  <div className="mt-4 space-y-3">
                    {[
                      { name: "Groceries", amount: "₴2,000", color: COLORS.green },
                      { name: "Entertainment", amount: "₴600", color: COLORS.orange },
                      { name: "Transport", amount: "₴1,100", color: COLORS.purple },
                    ].map((row) => (
                      <div key={row.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <Dot color={row.color} />
                          <span className="text-sm text-foreground">{row.name}</span>
                        </div>
                        <span className="text-sm font-semibold text-foreground">{row.amount}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </Reveal>
          </div>
        </section>

        {/* 4. Monobank sync — mirrored: card left, copy right (copy first in DOM for mobile) */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="grid md:grid-cols-2 gap-12 md:gap-8 items-center">
            <Reveal className="md:order-2">
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
                Your transactions, organized automatically
              </h2>
              <p className="mt-4 text-lg text-muted-foreground max-w-xl">
                Connect Monobank once and Moneta keeps your spending categorized and up to date.
                Prefer to add things yourself? That works too.
              </p>
            </Reveal>

            <Reveal className="md:order-1">
              <Card className="shadow-lg transition-shadow hover:shadow-xl">
                <CardContent className="p-5 sm:p-6">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    <span className="text-sm font-semibold text-foreground">Synced 2 minutes ago</span>
                  </div>
                  <div className="mt-4 border-t border-border" />
                  <div className="mt-4 space-y-3">
                    {[
                      { name: "ATB", amount: "−₴421.20", income: false },
                      { name: "Salary", amount: "+₴45,000.00", income: true },
                      { name: "Uklon", amount: "−₴623.10", income: false },
                    ].map((tx) => (
                      <div key={tx.name} className="flex items-center justify-between">
                        <span className="text-sm text-foreground">{tx.name}</span>
                        <span
                          className={`text-sm font-semibold ${
                            tx.income ? "text-green-500" : "text-foreground"
                          }`}
                        >
                          {tx.amount}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </Reveal>
          </div>
        </section>

        {/* 5. Categories + Trips — two cards side by side */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <Reveal>
            <h2 className="text-center text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
              Two more ways Moneta keeps you on track
            </h2>
          </Reveal>
          <div className="mt-12 grid md:grid-cols-2 gap-6">
            <Reveal>
              <Card className="h-full shadow-lg transition-shadow hover:shadow-xl">
                <CardContent className="p-6 sm:p-8">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-sm"
                    style={{ backgroundColor: COLORS.purple }}
                  >
                    <LayoutGrid className="w-6 h-6" />
                  </div>
                  <h3 className="mt-5 text-xl font-bold text-foreground">See exactly where it's going</h3>
                  <p className="mt-3 text-muted-foreground">
                    Every transaction lands in a category, so you can finally see the ₴3,000 you
                    didn't realize went to takeout this month.
                  </p>
                  <div className="mt-6 flex gap-2">
                    {[COLORS.green, COLORS.orange, COLORS.pink, COLORS.yellow].map((color) => (
                      <span
                        key={color}
                        className="w-8 h-8 rounded-lg"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            </Reveal>

            <Reveal>
              <Card className="h-full shadow-lg transition-shadow hover:shadow-xl">
                <CardContent className="p-6 sm:p-8">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-sm"
                    style={{ backgroundColor: COLORS.orange }}
                  >
                    <Plane className="w-6 h-6" />
                  </div>
                  <h3 className="mt-5 text-xl font-bold text-foreground">Save for what matters</h3>
                  <p className="mt-3 text-muted-foreground">
                    Set up a goal — a trip, a big purchase, an emergency fund — and watch it fill up
                    as you save, tracked separately from your everyday budget.
                  </p>
                  <div className="mt-6 h-2 w-full rounded-full overflow-hidden bg-muted">
                    <div
                      className="h-full rounded-full"
                      style={{ width: "65%", backgroundColor: COLORS.orange }}
                    />
                  </div>
                </CardContent>
              </Card>
            </Reveal>
          </div>
        </section>
      </main>

      {/* 6. Closing CTA — full-bleed navy band */}
      <section className="text-primary-foreground" style={{ background: NAVY_GRADIENT }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28 text-center">
          <Reveal>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Ready to see where your money's really going?
            </h2>
            <div className="mt-8 flex justify-center">
              <Button asChild size="lg" className="bg-white text-[#030213] hover:bg-white/90">
                <Link to="/sign-up">Sign up free</Link>
              </Button>
            </div>
            <p className="mt-6 text-sm text-primary-foreground/70">
              Free during early access. If we ever introduce paid plans, current users will hear
              about it first.
            </p>
          </Reveal>
        </div>
      </section>

      {/* 7. Footer */}
      <footer className="border-t border-border">
        <div className="max-w-6xl mx-auto px-4 py-6 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-bold text-foreground">Moneta</span>
            <span className="text-muted-foreground">· Budgeting, synced from your bank.</span>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link to="/sign-in" className="hover:text-foreground transition-colors">
              Sign in
            </Link>
            <Link to="/sign-up" className="hover:text-foreground transition-colors">
              Sign up
            </Link>
            <span>© 2026 Moneta</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
