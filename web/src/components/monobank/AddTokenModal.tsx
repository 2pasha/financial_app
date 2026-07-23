import { useState } from 'react';
import { monobankApi } from '../../lib/api-client';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Alert, AlertDescription } from '../ui/alert';
import { Loader2, AlertCircle, ShieldCheck, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { useAppSettings } from '../../hooks/useAppSettings';

interface AddTokenModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const MONOBANK_TOKEN_URL = 'https://api.monobank.ua/';

export function AddTokenModal({ open, onOpenChange, onSuccess }: AddTokenModalProps) {
  const { t } = useAppSettings();
  const [token, setToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!token.trim()) {
      setError(t.monoTokenRequired);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await monobankApi.saveToken(token);
      toast.success(t.monoTokenSaved);
      onSuccess();
    } catch (err: any) {
      setError(err.message || t.monoTokenSaveFailed);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t.monoConnectTitle}</DialogTitle>
          <DialogDescription>{t.monoConnectIntro}</DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="mono-token">{t.monoTokenLabel}</Label>
            <Input
              id="mono-token"
              placeholder={t.monoTokenPlaceholder}
              value={token}
              onChange={(e) => setToken(e.target.value)}
              disabled={isLoading}
              className="font-mono"
              autoFocus
            />
            <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 mt-0.5 shrink-0 text-green-600" />
              {t.monoTokenHint}
            </p>
          </div>

          {/* How to get your token */}
          <div className="rounded-lg border border-border bg-muted/40 p-3">
            <p className="text-sm font-medium text-foreground mb-2">{t.monoHowToTitle}</p>
            <ol className="text-xs space-y-1.5 list-decimal list-outside pl-4 text-muted-foreground">
              <li>{t.monoStep1}</li>
              <li>{t.monoStep2}</li>
              <li>{t.monoStep3}</li>
              <li>{t.monoStep4}</li>
            </ol>
            <a
              href={MONOBANK_TOKEN_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
            >
              {t.monoOpenSite}
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
              className="flex-1"
            >
              {t.cancel}
            </Button>
            <Button onClick={handleSave} disabled={isLoading} className="flex-1">
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t.monoSaveToken}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
