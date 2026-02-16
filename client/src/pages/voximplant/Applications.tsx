import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Copy, CheckCircle2, Code, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function VoximplantApplications() {
  const { toast } = useToast();
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCodeDialogOpen, setIsCodeDialogOpen] = useState(false);
  const [selectedCode, setSelectedCode] = useState('');
  const [formData, setFormData] = useState({
    voximplantApplicationId: '',
    voximplantRuleId: '',
    applicationName: '',
    elevenlabsApiKey: '',
    elevenlabsAgentId: '',
    phoneNumber: '',
  });

  const { data: accounts } = trpc.voximplant.getAccounts.useQuery();
  const { data: applications, isLoading: applicationsLoading } =
    trpc.voximplant.getApplications.useQuery(
      { voximplantAccountId: selectedAccountId! },
      { enabled: !!selectedAccountId }
    );

  const createMutation = trpc.voximplant.createApplication.useMutation();
  const deleteMutation = trpc.voximplant.deleteApplication.useMutation();
  const utils = trpc.useUtils();

  const handleCreateApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccountId) return;

    try {
      await createMutation.mutateAsync({
        voximplantAccountId: selectedAccountId,
        ...formData,
      });

      toast({
        title: 'Application created',
        description: 'Voximplant application has been created successfully',
      });

      setIsCreateDialogOpen(false);
      setFormData({
        voximplantApplicationId: '',
        voximplantRuleId: '',
        applicationName: '',
        elevenlabsApiKey: '',
        elevenlabsAgentId: '',
        phoneNumber: '',
      });

      utils.voximplant.getApplications.invalidate();
    } catch (error: any) {
      toast({
        title: 'Failed to create application',
        description: error.message || 'An error occurred',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteApplication = async (id: number) => {
    if (!confirm('Are you sure you want to delete this application?')) return;

    try {
      await deleteMutation.mutateAsync({ id });
      toast({
        title: 'Application deleted',
        description: 'Application has been deleted successfully',
      });
      utils.voximplant.getApplications.invalidate();
    } catch (error: any) {
      toast({
        title: 'Failed to delete application',
        description: error.message || 'An error occurred',
        variant: 'destructive',
      });
    }
  };

  const handleViewCode = (code: string) => {
    setSelectedCode(code);
    setIsCodeDialogOpen(true);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(selectedCode);
    toast({
      title: 'Copied!',
      description: 'Scenario code copied to clipboard',
    });
  };

  if (!accounts || accounts.length === 0) {
    return (
      <div className="container max-w-4xl py-8">
        <Card>
          <CardHeader>
            <CardTitle>No Voximplant Account</CardTitle>
            <CardDescription>
              You need to set up a Voximplant account first before creating applications.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button onClick={() => (window.location.href = '/voximplant/setup')}>
              Go to Setup
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Voximplant Applications</h1>
          <p className="text-muted-foreground mt-2">
            Manage your Voximplant applications and ElevenLabs agent integrations
          </p>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button disabled={!selectedAccountId}>
              <Plus className="mr-2 h-4 w-4" />
              New Application
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Application</DialogTitle>
              <DialogDescription>
                Create a new Voximplant application linked to an ElevenLabs agent
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateApplication}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="voximplantApplicationId">Voximplant Application ID (Optional)</Label>
                  <Input
                    id="voximplantApplicationId"
                    value={formData.voximplantApplicationId}
                    onChange={(e) => setFormData({ ...formData, voximplantApplicationId: e.target.value })}
                    placeholder="12345678"
                  />
                  <p className="text-sm text-muted-foreground">
                    After creating the scenario in Voximplant, paste the Application ID here
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="voximplantRuleId">Voximplant Rule ID (Optional)</Label>
                  <Input
                    id="voximplantRuleId"
                    value={formData.voximplantRuleId}
                    onChange={(e) => setFormData({ ...formData, voximplantRuleId: e.target.value })}
                    placeholder="87654321"
                  />
                  <p className="text-sm text-muted-foreground">
                    After creating the routing rule, paste the Rule ID here
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="applicationName">Application Name</Label>
                  <Input
                    id="applicationName"
                    value={formData.applicationName}
                    onChange={(e) =>
                      setFormData({ ...formData, applicationName: e.target.value })
                    }
                    placeholder="Customer Support Agent"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="elevenlabsApiKey">ElevenLabs API Key</Label>
                  <Input
                    id="elevenlabsApiKey"
                    type="password"
                    value={formData.elevenlabsApiKey}
                    onChange={(e) =>
                      setFormData({ ...formData, elevenlabsApiKey: e.target.value })
                    }
                    placeholder="sk_..."
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="elevenlabsAgentId">ElevenLabs Agent ID</Label>
                  <Input
                    id="elevenlabsAgentId"
                    value={formData.elevenlabsAgentId}
                    onChange={(e) =>
                      setFormData({ ...formData, elevenlabsAgentId: e.target.value })
                    }
                    placeholder="agent_..."
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">Phone Number (Optional)</Label>
                  <Input
                    id="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                    placeholder="+1234567890"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Application
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Account Selector */}
      <div className="mb-6">
        <Label>Select Voximplant Account</Label>
        <Select
          value={selectedAccountId?.toString()}
          onValueChange={(value) => setSelectedAccountId(parseInt(value))}
        >
          <SelectTrigger className="w-full max-w-md mt-2">
            <SelectValue placeholder="Select an account" />
          </SelectTrigger>
          <SelectContent>
            {accounts.map((account) => (
              <SelectItem key={account.id} value={account.id.toString()}>
                {account.accountName || account.accountId}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Applications List */}
      {applicationsLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : applications && applications.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {applications.map((app) => (
            <Card key={app.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{app.applicationName}</CardTitle>
                    <CardDescription className="mt-1">
                      {app.voximplantApplicationId && `App ID: ${app.voximplantApplicationId}`}
                      {app.voximplantRuleId && ` | Rule ID: ${app.voximplantRuleId}`}
                    </CardDescription>
                  </div>
                  <Badge variant={app.status === 'active' ? 'default' : 'secondary'}>
                    {app.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Agent ID:</span>{' '}
                    <code className="text-xs">{app.elevenlabsAgentId}</code>
                  </div>
                  {app.phoneNumber && (
                    <div>
                      <span className="text-muted-foreground">Phone:</span> {app.phoneNumber}
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleViewCode(app.scenarioCode || '')}
                >
                  <Code className="mr-2 h-4 w-4" />
                  View Code
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDeleteApplication(app.id)}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : selectedAccountId ? (
        <Card>
          <CardHeader>
            <CardTitle>No Applications</CardTitle>
            <CardDescription>
              You haven't created any applications yet. Click "New Application" to get started.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {/* Code Dialog */}
      <Dialog open={isCodeDialogOpen} onOpenChange={setIsCodeDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>VoxEngine Scenario Code</DialogTitle>
            <DialogDescription>
              Follow these steps to complete the integration:
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg text-sm">
              <h4 className="font-semibold mb-2">Setup Instructions:</h4>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li>Copy the JavaScript code below</li>
                <li>Go to Voximplant Dashboard → Applications → Scenarios</li>
                <li>Create a new scenario and paste the code</li>
                <li>Save the scenario and note the Application ID</li>
                <li>Create a routing rule for this scenario and note the Rule ID</li>
                <li>Come back here and paste both IDs in the application settings</li>
              </ol>
            </div>
            <div className="relative">
              <pre className="bg-muted p-4 rounded-lg overflow-auto max-h-[40vh] text-sm">
                <code>{selectedCode}</code>
              </pre>
              <Button
                size="sm"
                variant="outline"
                className="absolute top-2 right-2"
                onClick={handleCopyCode}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
