import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Loader2, Sparkles, Copy, ExternalLink, ClipboardCheck } from "lucide-react";
import { toast } from "sonner";
import { fetchMonthSnapshot, buildAiPrompt, monthKey, type MonthSnapshot } from "../lib/ai-export";
import type { Language } from "../lib/translations";

// Pre-filled prompt URLs break silently past a few thousand chars; beyond this, only Copy works.
const MAX_LINK_LENGTH = 6000;

// Gemini has no prompt-prefill URL support, so its entry copies the prompt and
// shows an instruction banner before the user opens Gemini in a new tab.
const AI_TARGETS: Array<
  | { name: string; prefill: (q: string) => string }
  | { name: string; copyAndOpen: string }
> = [
  { name: 'ChatGPT', prefill: (q: string) => `https://chatgpt.com/?q=${q}` },
  { name: 'Claude', prefill: (q: string) => `https://claude.ai/new?q=${q}` },
  { name: 'Gemini', copyAndOpen: 'https://gemini.google.com/app' },
];

interface AiAnalysisDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  period: { year: number; month: number };
  language: Language;
  currency: string;
  monthLabel: (year: number, month: number) => string;
  translations: {
    aiDialogTitle: string;
    aiDialogDescription: string;
    aiMonthsToInclude: string;
    aiIncludeIncome: string;
    aiCopy: string;
    aiCopied: string;
    aiCopyFailed: string;
    aiOpenIn: string;
    aiTooLongForLink: string;
    aiLoadFailed: string;
    aiGeminiBanner: string;
    aiOpenGemini: string;
    aiScopeDisclosure: string;
  };
}

export function AiAnalysisDialog({
  open,
  onOpenChange,
  period,
  language,
  currency,
  monthLabel,
  translations: t,
}: AiAnalysisDialogProps) {
  // Viewed month + the 3 preceding months, newest first
  const months = useMemo(() => {
    const list: { year: number; month: number }[] = [];
    for (let i = 0; i < 4; i++) {
      const d = new Date(period.year, period.month - 1 - i, 1);
      list.push({ year: d.getFullYear(), month: d.getMonth() + 1 });
    }
    return list;
  }, [period.year, period.month]);

  const viewedKey = monthKey(period.year, period.month);

  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [snapshots, setSnapshots] = useState<Record<string, MonthSnapshot>>({});
  const [loading, setLoading] = useState(false);

  // Reset selection when the dialog opens or the viewed period changes
  useEffect(() => {
    if (open) {
      setSelectedKeys(new Set(months.map((m) => monthKey(m.year, m.month))));
    }
  }, [open, months]);

  const [includeIncome, setIncludeIncome] = useState(true);
  const [showGeminiHint, setShowGeminiHint] = useState(false);

  // Start each dialog session without the Gemini instruction banner
  useEffect(() => {
    if (open) setShowGeminiHint(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const missing = months.filter((m) => !snapshots[monthKey(m.year, m.month)]);
    if (missing.length === 0) return;

    let cancelled = false;
    setLoading(true);
    Promise.all(missing.map((m) => fetchMonthSnapshot(m.year, m.month)))
      .then((results) => {
        if (cancelled) return;
        setSnapshots((prev) => {
          const next = { ...prev };
          for (const snap of results) next[monthKey(snap.year, snap.month)] = snap;
          return next;
        });
      })
      .catch(() => {
        if (!cancelled) toast.error(t.aiLoadFailed);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, months, snapshots, t.aiLoadFailed]);

  const promptText = useMemo(() => {
    const selected = months
      .filter((m) => selectedKeys.has(monthKey(m.year, m.month)))
      .map((m) => snapshots[monthKey(m.year, m.month)])
      .filter((s): s is MonthSnapshot => Boolean(s));

    if (selected.length === 0) return '';

    return buildAiPrompt(selected, { includeIncome, language, currency });
  }, [months, selectedKeys, snapshots, includeIncome, language, currency]);

  const encodedLength = useMemo(() => encodeURIComponent(promptText).length, [promptText]);
  const tooLongForLink = encodedLength > MAX_LINK_LENGTH;

  const toggleMonth = (key: string) => {
    if (key === viewedKey) return;
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(promptText);
      toast.success(t.aiCopied);
    } catch {
      toast.error(t.aiCopyFailed);
    }
  };

  const handleOpen = async (target: (typeof AI_TARGETS)[number]) => {
    if ('prefill' in target) {
      window.open(target.prefill(encodeURIComponent(promptText)), '_blank', 'noopener');
      return;
    }

    // No prefill support: copy first and let the user read the paste
    // instructions before the new tab steals focus.
    await handleCopy();
    setShowGeminiHint(true);
  };

  const handleOpenGemini = async (url: string) => {
    // Re-copy so the clipboard is fresh even if options changed after the banner appeared
    try {
      await navigator.clipboard.writeText(promptText);
    } catch {
      /* keep whatever was copied when the banner appeared */
    }
    window.open(url, '_blank', 'noopener');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            {t.aiDialogTitle}
          </DialogTitle>
          <DialogDescription>{t.aiDialogDescription}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t.aiMonthsToInclude}</Label>
            <div className="flex flex-wrap gap-1.5">
              {months.map((m) => {
                const key = monthKey(m.year, m.month);
                const selected = selectedKeys.has(key);
                return (
                  <Button
                    key={key}
                    variant={selected ? 'default' : 'outline'}
                    size="sm"
                    disabled={key === viewedKey}
                    onClick={() => toggleMonth(key)}
                    className="text-xs"
                  >
                    {monthLabel(m.year, m.month)}
                  </Button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              id="ai-include-income"
              type="checkbox"
              checked={includeIncome}
              onChange={(e) => setIncludeIncome(e.target.checked)}
              className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
            />
            <Label htmlFor="ai-include-income" className="cursor-pointer">
              {t.aiIncludeIncome}
            </Label>
          </div>

          <p className="text-xs text-muted-foreground">{t.aiScopeDisclosure}</p>

          {loading && !promptText ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <pre className="max-h-64 overflow-auto rounded-md border border-border bg-muted p-3 text-xs whitespace-pre-wrap font-mono">
              {promptText}
            </pre>
          )}

          {tooLongForLink && (
            <p className="text-xs text-muted-foreground">{t.aiTooLongForLink}</p>
          )}

          {showGeminiHint && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-md border border-border bg-muted p-3">
              <ClipboardCheck className="w-4 h-4 shrink-0 text-green-600 dark:text-green-500 hidden sm:block" />
              <p className="text-sm flex-1">{t.aiGeminiBanner}</p>
              <Button
                size="sm"
                className="shrink-0"
                onClick={() => {
                  const gemini = AI_TARGETS.find((target) => 'copyAndOpen' in target);
                  if (gemini && 'copyAndOpen' in gemini) handleOpenGemini(gemini.copyAndOpen);
                }}
              >
                <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                {t.aiOpenGemini}
              </Button>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            {AI_TARGETS.map((target) => (
              <Button
                key={target.name}
                variant="outline"
                size="sm"
                disabled={!promptText || ('prefill' in target && tooLongForLink)}
                onClick={() => handleOpen(target)}
              >
                <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                {t.aiOpenIn} {target.name}
              </Button>
            ))}
          </div>
          <Button onClick={handleCopy} disabled={!promptText}>
            <Copy className="w-4 h-4 mr-2" />
            {t.aiCopy}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
