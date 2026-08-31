import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  Wallet,
  LayoutGrid,
  CalendarCheck,
  Plane,
  Landmark,
  Pencil,
  ChevronRight,
  ShoppingCart,
  CheckCircle2,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { monobankApi } from "../lib/api-client";
import { useAppSettings } from "../hooks/useAppSettings";
import { track } from "../lib/posthog";

/** Terminal actions, in the order a user is most likely to take them. */
type ExitAction =
  | 'connect_monobank'
  | 'add_manually'
  | 'add_category'
  | 'skip'
  | 'decide_later'
  | 'dismiss';

const STEP_NAMES = ['welcome', 'mental_model', 'import_choice', 'first_category'] as const;

interface WelcomeFlowProps {
  open: boolean;
  /** Whether the flow opened by itself for a new user, or from the header "?". */
  trigger: 'auto' | 'manual';
  /** Marks onboarding complete and closes (Skip, finish, or any terminal action). */
  onComplete: () => void;
  /** Step 3 — routes to the Monobank setup screen. */
  onConnectMonobank: () => void;
  /** Step 3 — switches to Expenses and opens the New Transaction dialog. */
  onAddManually: () => void;
  /** Step 4 — opens the Add Category dialog. */
  onAddCategory: () => void;
}

const TOTAL_STEPS = 4;

/** Filled/empty dot row mirroring the design's step indicator. */
function StepDots({ step }: { step: number }) {
  return (
    <div className="flex items-center justify-center gap-2 py-1">
      {Array.from({ length: TOTAL_STEPS }, (_, i) => (
        <span
          key={i}
          className={`h-2 w-2 rounded-full transition-colors ${
            i + 1 === step ? "bg-primary" : "bg-muted"
          }`}
        />
      ))}
    </div>
  );
}

export function WelcomeFlow({
  open,
  trigger,
  onComplete,
  onConnectMonobank,
  onAddManually,
  onAddCategory,
}: WelcomeFlowProps) {
  const { t } = useAppSettings();
  const [step, setStep] = useState(1);
  const [monobankConnected, setMonobankConnected] = useState(false);

  // Smoothly animate the dialog's height as steps of different heights swap in.
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState<number | undefined>(undefined);

  useLayoutEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    const measure = () => setContentHeight(el.offsetHeight);
    measure();

    // Re-measure on late layout shifts (font load, the async Monobank status, wrapping).
    const observer = new ResizeObserver(measure);
    observer.observe(el);

    return () => observer.disconnect();
  }, [step, open, monobankConnected]);

  // Restart at step 1 whenever the flow is (re)opened — e.g. the header "?" re-trigger.
  useEffect(() => {
    if (open) {
      setStep(1);
      track('onboarding_started', { trigger });
    }
  }, [open]);

  // Per-step views are what turn onboarding into a funnel you can read.
  useEffect(() => {
    if (!open) return;
    track('onboarding_step_viewed', { step, step_name: STEP_NAMES[step - 1] });
  }, [open, step]);

  // Reflect whether Monobank is already connected on step 3's "Connect" card.
  // Fetched only while open; harmless for first-run users (returns hasToken: false).
  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    monobankApi
      .checkTokenStatus()
      .then((status) => {
        if (!cancelled) setMonobankConnected(status.hasToken);
      })
      .catch(() => {
        // Non-fatal: fall back to the default "connect" wording.
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  const finish = (exitAction: ExitAction) => {
    track('onboarding_completed', { exit_action: exitAction, last_step: step });
    onComplete();
  };

  const runAndComplete = (exitAction: ExitAction, action: () => void) => {
    action();
    finish(exitAction);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && finish('dismiss')}>
      <DialogContent
        aria-describedby={undefined}
        showClose={false}
        className="sm:max-w-md gap-0 overflow-hidden"
      >
        {/* Skip — present on every step, top-right corner. */}
        <button
          type="button"
          onClick={() => finish('skip')}
          className="absolute top-4 right-4 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          {t.skip}
        </button>

        {/* Height-animated shell: eases between steps of differing height. */}
        <div
          className="overflow-hidden transition-[height] duration-300 ease-out"
          style={{ height: contentHeight }}
        >
          <div ref={contentRef}>
            {/* Keyed by step so the enter animation replays on every transition. */}
            <div key={step} className="welcome-step-enter">
        {step === 1 && (
          <div className="flex flex-col items-center gap-5 pt-6 text-center">
            <DialogTitle className="sr-only">{t.welcomeTitle}</DialogTitle>
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-lg">
              <Wallet className="h-9 w-9" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-foreground">{t.welcomeTitle}</h2>
              <DialogDescription className="text-base text-muted-foreground">
                {t.welcomeBody}
              </DialogDescription>
            </div>
            <StepDots step={step} />
            <Button size="lg" className="w-full" onClick={() => setStep(2)}>
              {t.getStarted}
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col items-center gap-5 pt-6 text-center">
            <DialogTitle className="sr-only">{t.welcomeTabsTitle}</DialogTitle>
            <div className="grid w-full grid-cols-3 gap-3">
              <MentalModelCard
                icon={<LayoutGrid className="h-6 w-6" />}
                tint="bg-indigo-500"
                title={t.categories}
                subtitle={t.welcomeCardCategories}
              />
              <MentalModelCard
                icon={<CalendarCheck className="h-6 w-6" />}
                tint="bg-green-500"
                title={t.planning}
                subtitle={t.welcomeCardPlan}
              />
              <MentalModelCard
                icon={<Plane className="h-6 w-6" />}
                tint="bg-orange-500"
                title={t.navTrips}
                subtitle={t.welcomeCardTrips}
              />
            </div>
            <div className="space-y-2 pt-2">
              <h2 className="text-2xl font-bold text-foreground">{t.welcomeTabsTitle}</h2>
              <DialogDescription className="text-base text-muted-foreground">
                {t.welcomeTabsBody}
              </DialogDescription>
            </div>
            <StepDots step={step} />
            <Button size="lg" className="w-full" onClick={() => setStep(3)}>
              {t.next}
            </Button>
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col gap-5 pt-6">
            <div className="space-y-2 text-center">
              <DialogTitle className="text-2xl font-bold text-foreground">
                {t.welcomeImportTitle}
              </DialogTitle>
              <DialogDescription className="text-base text-muted-foreground">
                {t.welcomeImportBody}
              </DialogDescription>
            </div>
            <div className="flex flex-col gap-3">
              <ChoiceCard
                icon={<Landmark className="h-5 w-5" />}
                tint="bg-blue-600"
                title={t.connectMonobank}
                subtitle={
                  monobankConnected
                    ? t.welcomeAlreadyConnected
                    : t.welcomeSyncAuto
                }
                trailing={
                  monobankConnected ? (
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" />
                  ) : undefined
                }
                onClick={() => runAndComplete('connect_monobank', onConnectMonobank)}
              />
              <ChoiceCard
                icon={<Pencil className="h-5 w-5" />}
                tint="bg-muted-foreground"
                title={t.welcomeAddManually}
                subtitle={t.welcomeEnterYourself}
                onClick={() => runAndComplete('add_manually', onAddManually)}
              />
            </div>
            <StepDots step={step} />
            <button
              type="button"
              onClick={() => setStep(4)}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {t.welcomeDecideLater}
            </button>
          </div>
        )}

        {step === 4 && (
          <div className="flex flex-col gap-5 pt-6">
            {/* Static preview of a category card (matches the design mock). */}
            <div className="flex items-center gap-3 rounded-xl border border-border p-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-green-500 text-white">
                <ShoppingCart className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-foreground">{t.groceries}</p>
                <p className="text-sm text-muted-foreground">{t.welcomeBudgetedExample}</p>
              </div>
              <div className="flex shrink-0 gap-1.5">
                {["#6366f1", "#ec4899", "#f97316", "#eab308"].map((c) => (
                  <span
                    key={c}
                    className="h-4 w-4 rounded"
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            <div className="space-y-2 text-center">
              <DialogTitle className="text-2xl font-bold text-foreground">
                {t.welcomeCategoryTitle}
              </DialogTitle>
              <DialogDescription className="text-base text-muted-foreground">
                {t.welcomeCategoryBody}
              </DialogDescription>
            </div>
            <StepDots step={step} />
            <Button
              size="lg"
              className="w-full"
              onClick={() => runAndComplete('add_category', onAddCategory)}
            >
              {t.welcomeAddFirstCategory}
            </Button>
            <button
              type="button"
              onClick={() => finish('decide_later')}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {t.welcomeDoLater}
            </button>
          </div>
        )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function MentalModelCard({
  icon,
  tint,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  tint: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <div
        className={`flex h-12 w-12 items-center justify-center rounded-xl text-white ${tint}`}
      >
        {icon}
      </div>
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="text-xs leading-snug text-muted-foreground">{subtitle}</p>
    </div>
  );
}

function ChoiceCard({
  icon,
  tint,
  title,
  subtitle,
  onClick,
  trailing,
}: {
  icon: React.ReactNode;
  tint: string;
  title: string;
  subtitle: string;
  onClick: () => void;
  /** Right-side element; defaults to a chevron. */
  trailing?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl border border-border p-3 text-left transition-colors hover:bg-accent"
    >
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-white ${tint}`}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
      {trailing ?? <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />}
    </button>
  );
}
