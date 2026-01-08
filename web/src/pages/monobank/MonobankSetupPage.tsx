import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { monobankApi } from '../../lib/api-client';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function MonobankSetupPage() {
  const [token, setToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleSaveToken = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!token.trim()) {
      setError('Please enter a Monobank token');
      return;
    }

    setIsLoading(true);

    try {
      const response = await monobankApi.saveToken(token);
      setSuccess(true);
      toast.success(response.message);
      
      // Redirect to sync page after a short delay
      setTimeout(() => {
        navigate('/monobank/sync');
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to save token');
      toast.error('Failed to save token');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Connect Your Monobank Account</CardTitle>
          <CardDescription>
            Enter your Monobank personal API token to sync your transactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveToken} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="bg-green-50 text-green-900 border-green-200">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription>
                  Token saved successfully! Redirecting...
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <label htmlFor="token" className="text-sm font-medium">
                Monobank API Token
              </label>
              <Input
                id="token"
                type="text"
                placeholder="Enter your Monobank token"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                disabled={isLoading || success}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                You can get your personal API token from the Monobank mobile app in Settings → API for developers
              </p>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || success}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {success ? 'Token Saved!' : 'Save Token'}
            </Button>

            <div className="pt-4 border-t">
              <h3 className="font-semibold mb-2">How to get your Monobank token:</h3>
              <ol className="text-sm space-y-1 list-decimal list-inside text-muted-foreground">
                <li>Open the Monobank mobile app</li>
                <li>Go to Settings</li>
                <li>Find "API for developers"</li>
                <li>Generate a personal API token</li>
                <li>Copy and paste it here</li>
              </ol>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
