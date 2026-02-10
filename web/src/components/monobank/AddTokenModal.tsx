import { useState } from 'react';
import { monobankApi } from '../../lib/api-client';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Alert, AlertDescription } from '../ui/alert';
import { Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface AddTokenModalProps {
  open: boolean;
  onSuccess: () => void;
}

export function AddTokenModal({ open, onSuccess }: AddTokenModalProps) {
  const [token, setToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!token.trim()) {
      setError('Please enter a token');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await monobankApi.saveToken(token);
      toast.success('Token saved successfully!');
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to save token');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Connect Monobank</DialogTitle>
          <DialogDescription>
            Enter your Monobank personal API token to sync your transactions
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <div>
            <Input
              placeholder="Enter your Monobank token"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              disabled={isLoading}
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Get your token from Monobank app: Settings → API for developers
            </p>
          </div>

          <Button onClick={handleSave} disabled={isLoading} className="w-full">
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Token
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
