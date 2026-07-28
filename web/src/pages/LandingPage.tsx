import { useEffect, useRef, useState, type ReactNode } from "react";
import { CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "../components/ui/card";
import { SiteFrame } from "../components/SiteFrame";
import { LandingHeader } from "../components/LandingHeader";
import { LandingHero } from "../components/LandingHero";
import { LandingStatement } from "../components/LandingStatement";
import { LandingServices } from "../components/LandingServices";
import { LandingAbout } from "../components/LandingAbout";
import { LandingFooter } from "../components/LandingFooter";
import { useAppSettings } from "../hooks/useAppSettings";

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

export default function LandingPage() {
  const { language, toggleLanguage, isDarkMode, toggleTheme, t } = useAppSettings();

  return (
    /*
     * No background on the wrapper. The footer is pinned behind the page and
     * revealed as `main` scrolls off it, so anything opaque out here would paint
     * over it — see LandingFooter.
     */
    <div className="min-h-screen text-foreground">
      {/*
       * The marketing page wears the same chrome as the app: the frame's four edge
       * bands, with the header pill hanging off the top one. Sections below are
       * still full-bleed and scroll under the bands — reconciling them with the
       * frame is the next pass.
       */}
      <SiteFrame />
      <LandingHeader
        t={t}
        language={language}
        isDarkMode={isDarkMode}
        onToggleLanguage={toggleLanguage}
        onToggleTheme={toggleTheme}
      />

      {/* `relative z-10 bg-background` is what the footer reveal slides against. */}
      <main className="relative z-10 bg-background">
        {/* 2. Hero */}
        <LandingHero />

        {/* 3. The statement — scroll-scrubbed, word by word */}
        <LandingStatement />

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

        {/* 5. Four phrases, full-bleed, inverting on hover */}
        <LandingServices />

        {/* 6. Why it exists — photo, statement, closing CTA */}
        <LandingAbout />
      </main>

      {/* 7. Footer — pinned behind the page and revealed as main scrolls off it */}
      <LandingFooter />
    </div>
  );
}
