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
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Sparkles, CheckCircle2, Copy, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CreatedAgentResult {
  success: boolean;
  applicationId: number;
  applicationName: string;
  scenarioCode: string;
  instructions: {
    step1: string;
    step2: string;
    step3: string;
    step4: string;
    step5: string;
    step6: string;
  };
}

export default function CreateAgent() {
  const { toast } = useToast();
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    agentName: '',
    elevenlabsApiKey: '',
    elevenlabsAgentId: '',
    phoneNumberId: '',
    maxDuration: '600',
    silenceTimeout: '20',
  });
  const [createdAgent, setCreatedAgent] = useState<CreatedAgentResult | null>(null);

  const { data: accounts } = trpc.voximplant.getAccounts.useQuery();
  const { data: phoneNumbers, isLoading: phoneNumbersLoading } =
    trpc.voximplant.getPhoneNumbers.useQuery(
      { accountId: selectedAccountId! },
      { enabled: !!selectedAccountId }
    );

  const createAgentMutation = trpc.voximplant.createAgent.useMutation();

  const handleCreateAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccountId) {
      toast({
        title: 'Select account',
        description: 'Please select a Voximplant account first',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.agentName || !formData.elevenlabsApiKey || !formData.elevenlabsAgentId) {
      toast({
        title: 'Fill required fields',
        description: 'Please fill all required fields',
        variant: 'destructive',
      });
      return;
    }

    try {
      const result = await createAgentMutation.mutateAsync({
        accountId: selectedAccountId,
        ...formData,
      });

      setCreatedAgent(result as CreatedAgentResult);

      toast({
        title: 'Application created! 🎉',
        description: 'Follow the instructions below to complete setup',
      });
    } catch (error: any) {
      toast({
        title: 'Failed to create application',
        description: error.message || 'An error occurred',
        variant: 'destructive',
      });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied!',
      description: 'Code copied to clipboard',
    });
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Create AI Agent</h1>
          <p className="text-muted-foreground">
            Create VoximPlant application with ElevenLabs AI agent integration
          </p>
        </div>

        {createdAgent ? (
          <div className="space-y-6">
            {/* Success Card */}
            <Card className="border-green-500 bg-green-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-700">
                  <CheckCircle2 className="h-5 w-5" />
                  Application Created Successfully!
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div>
                  <strong>Application ID:</strong> {createdAgent.applicationId}
                </div>
                <div>
                  <strong>Application Name:</strong> {createdAgent.applicationName}
                </div>
              </CardContent>
            </Card>

            {/* Instructions Card */}
            <Card>
              <CardHeader>
                <CardTitle>Setup Instructions</CardTitle>
                <CardDescription>
                  Follow these steps to complete your AI agent setup in VoximPlant
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {Object.entries(createdAgent.instructions).map(([key, value]) => (
                    <div key={key} className="flex gap-3">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-semibold">
                        {key.replace('step', '')}
                      </div>
                      <p className="text-sm pt-0.5">{value}</p>
                    </div>
                  ))}
                </div>

                <div className="pt-4">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => window.open('https://manage.voximplant.com', '_blank')}
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Open VoximPlant Control Panel
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Scenario Code Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Generated VoxEngine JavaScript Code</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(createdAgent.scenarioCode)}
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Copy Code
                  </Button>
                </CardTitle>
                <CardDescription>
                  Copy this code and paste it into your new Scenario in VoximPlant
                </CardDescription>
              </CardHeader>
              <CardContent>
                <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                  <code>{createdAgent.scenarioCode}</code>
                </pre>
              </CardContent>
            </Card>

            <div className="flex gap-4">
              <Button
                variant="outline"
                onClick={() => {
                  setCreatedAgent(null);
                  setFormData({
                    agentName: '',
                    elevenlabsApiKey: '',
                    elevenlabsAgentId: '',
                    phoneNumberId: '',
                    maxDuration: '600',
                    silenceTimeout: '20',
                  });
                }}
                className="flex-1"
              >
                Create Another Agent
              </Button>
            </div>
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Agent Configuration
              </CardTitle>
              <CardDescription>
                Fill in the details below to create your AI agent
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateAgent} className="space-y-6">
                {/* VoximPlant Account Selection */}
                <div className="space-y-2">
                  <Label htmlFor="account">VoximPlant Account *</Label>
                  <Select
                    value={selectedAccountId?.toString() || ''}
                    onValueChange={(value) => setSelectedAccountId(Number(value))}
                  >
                    <SelectTrigger id="account">
                      <SelectValue placeholder="Select VoximPlant account" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts?.map((account) => (
                        <SelectItem key={account.id} value={account.id.toString()}>
                          {account.accountName || `Account ${account.accountId}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!accounts?.length && (
                    <p className="text-sm text-muted-foreground">
                      No accounts found. Please add a VoximPlant account in Setup first.
                    </p>
                  )}
                </div>

                {/* Agent Name */}
                <div className="space-y-2">
                  <Label htmlFor="agentName">Agent Name *</Label>
                  <Input
                    id="agentName"
                    placeholder="my-ai-agent"
                    value={formData.agentName}
                    onChange={(e) =>
                      setFormData({ ...formData, agentName: e.target.value })
                    }
                    required
                  />
                  <p className="text-sm text-muted-foreground">
                    Lowercase letters, numbers, and hyphens only (e.g., "sales-agent")
                  </p>
                </div>

                {/* ElevenLabs API Key */}
                <div className="space-y-2">
                  <Label htmlFor="elevenlabsApiKey">ElevenLabs API Key *</Label>
                  <Input
                    id="elevenlabsApiKey"
                    type="password"
                    placeholder="sk_..."
                    value={formData.elevenlabsApiKey}
                    onChange={(e) =>
                      setFormData({ ...formData, elevenlabsApiKey: e.target.value })
                    }
                    required
                  />
                </div>

                {/* ElevenLabs Agent ID */}
                <div className="space-y-2">
                  <Label htmlFor="elevenlabsAgentId">ElevenLabs Agent ID *</Label>
                  <Input
                    id="elevenlabsAgentId"
                    placeholder="agent_..."
                    value={formData.elevenlabsAgentId}
                    onChange={(e) =>
                      setFormData({ ...formData, elevenlabsAgentId: e.target.value })
                    }
                    required
                  />
                  <p className="text-sm text-muted-foreground">
                    Find this in your ElevenLabs Conversational AI dashboard
                  </p>
                </div>

                {/* Call Settings */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="maxDuration">Max Call Duration (seconds)</Label>
                    <Input
                      id="maxDuration"
                      type="number"
                      value={formData.maxDuration}
                      onChange={(e) =>
                        setFormData({ ...formData, maxDuration: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="silenceTimeout">Silence Timeout (seconds)</Label>
                    <Input
                      id="silenceTimeout"
                      type="number"
                      value={formData.silenceTimeout}
                      onChange={(e) =>
                        setFormData({ ...formData, silenceTimeout: e.target.value })
                      }
                    />
                  </div>
                </div>

                {/* Phone Number Selection */}
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">Phone Number (Optional)</Label>
                  {selectedAccountId ? (
                    phoneNumbersLoading ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading phone numbers...
                      </div>
                    ) : phoneNumbers && phoneNumbers.length > 0 ? (
                      <Select
                        value={formData.phoneNumberId}
                        onValueChange={(value) =>
                          setFormData({ ...formData, phoneNumberId: value })
                        }
                      >
                        <SelectTrigger id="phoneNumber">
                          <SelectValue placeholder="Select phone number (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">None</SelectItem>
                          {phoneNumbers.map((phone: any) => (
                            <SelectItem key={phone.phone_id} value={phone.phone_id.toString()}>
                              {phone.phone_number}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No phone numbers found for this account
                      </p>
                    )
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Select an account first to see available phone numbers
                    </p>
                  )}
                </div>

                {/* Submit Button */}
                <div className="flex gap-4 pt-4">
                  <Button
                    type="submit"
                    disabled={createAgentMutation.isPending || !selectedAccountId}
                    className="flex-1"
                  >
                    {createAgentMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating Application...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Create Agent
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Info Card */}
        {!createdAgent && (
          <Card className="mt-6 bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-blue-900 text-lg">How it works</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-blue-800">
              <p>
                <strong>Step 1:</strong> We create a VoximPlant Application for you
              </p>
              <p>
                <strong>Step 2:</strong> We generate optimized VoxEngine JavaScript code with ElevenLabs integration
              </p>
              <p>
                <strong>Step 3:</strong> You copy the code and create a Scenario in VoximPlant Control Panel
              </p>
              <p>
                <strong>Step 4:</strong> You create a Routing Rule and attach your phone number
              </p>
              <p className="pt-2 font-semibold">
                💡 This hybrid approach ensures maximum flexibility and reliability!
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
