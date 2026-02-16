import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function VoximplantSetup() {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    accountId: '',
    apiKey: '',
    accountName: '',
  });

  const { data: accounts, isLoading: accountsLoading } = trpc.voximplant.getAccounts.useQuery();
  const createAccountMutation = trpc.voximplant.createAccount.useMutation();
  const testConnectionMutation = trpc.voximplant.testConnection.useMutation();

  const handleTestConnection = async () => {
    try {
      const result = await testConnectionMutation.mutateAsync({
        accountId: formData.accountId,
        apiKey: formData.apiKey,
      });

      if (result.success) {
        toast({
          title: 'Connection successful',
          description: 'Voximplant credentials are valid',
        });
      } else {
        toast({
          title: 'Connection failed',
          description: 'Invalid Voximplant credentials',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Connection failed',
        description: error.message || 'Failed to test connection',
        variant: 'destructive',
      });
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await createAccountMutation.mutateAsync(formData);
      toast({
        title: 'Account created',
        description: 'Voximplant account has been added successfully',
      });
      setFormData({
        accountId: '',
        apiKey: '',
        accountName: '',
      });
    } catch (error: any) {
      toast({
        title: 'Failed to create account',
        description: error.message || 'An error occurred',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Voximplant Setup</h1>
        <p className="text-muted-foreground mt-2">
          Configure your Voximplant account credentials to start using the integration
        </p>
      </div>

      {/* Existing Accounts */}
      {accountsLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : accounts && accounts.length > 0 ? (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Your Accounts</h2>
          <div className="grid gap-4">
            {accounts.map((account) => (
              <Card key={account.id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {account.accountName || account.accountId}
                    {account.isActive ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-gray-400" />
                    )}
                  </CardTitle>
                  <CardDescription>Account ID: {account.accountId}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      ) : null}

      {/* Add New Account Form */}
      <Card>
        <CardHeader>
          <CardTitle>Add Voximplant Account</CardTitle>
          <CardDescription>
            Enter your Voximplant account credentials. You can find these in your Voximplant
            dashboard under Settings → Service Accounts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateAccount} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="accountId">Account ID</Label>
              <Input
                id="accountId"
                value={formData.accountId}
                onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
                placeholder="12345678"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key</Label>
              <Input
                id="apiKey"
                type="password"
                value={formData.apiKey}
                onChange={(e) =>
                  setFormData({ ...formData, apiKey: e.target.value })
                }
                placeholder="Enter Voximplant API Key"
                required
              />
              <p className="text-sm text-muted-foreground">
                Generate API Key in Voximplant Platform: Settings → API Keys
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="accountName">Account Name (Optional)</Label>
              <Input
                id="accountName"
                value={formData.accountName}
                onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                placeholder="My Voximplant Account"
              />
            </div>

            <Alert>
              <AlertDescription>
                <strong>Note:</strong> Your credentials are encrypted and stored securely. We
                recommend using a Service Account with limited permissions.
              </AlertDescription>
            </Alert>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleTestConnection}
                disabled={
                  !formData.accountId ||
                  !formData.apiKey ||
                  testConnectionMutation.isPending
                }
              >
                {testConnectionMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Test Connection
              </Button>

              <Button
                type="submit"
                disabled={
                  !formData.accountId ||
                  !formData.apiKey ||
                  createAccountMutation.isPending
                }
              >
                {createAccountMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Add Account
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>How to get your credentials</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none">
          <ol>
            <li>Log in to your Voximplant dashboard at voximplant.com</li>
            <li>Navigate to Settings → Service Accounts</li>
            <li>Create a new Service Account or use an existing one</li>
            <li>Copy the Account ID, Key ID, and Private Key</li>
            <li>Paste them into the form above</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
