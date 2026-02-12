import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Loader2, FileText, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useVoximplantCallPolling } from '@/hooks/useVoximplantCallPolling';

export default function VoximplantCallHistory() {
  const { toast } = useToast();
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [selectedApplicationId, setSelectedApplicationId] = useState<number | null>(null);
  const [selectedCallId, setSelectedCallId] = useState<number | null>(null);
  const [isTranscriptDialogOpen, setIsTranscriptDialogOpen] = useState(false);

  const { data: accounts } = trpc.voximplant.getAccounts.useQuery();
  const { data: applications } = trpc.voximplant.getApplications.useQuery(
    { voximplantAccountId: selectedAccountId! },
    { enabled: !!selectedAccountId }
  );
  // Enable real-time polling for active calls
  const { isSyncing } = useVoximplantCallPolling({
    applicationId: selectedApplicationId!,
    enabled: !!selectedApplicationId,
    interval: 10000, // Poll every 10 seconds
  });

  const { data: calls, isLoading: callsLoading } = trpc.voximplant.getCalls.useQuery(
    {
      applicationId: selectedApplicationId!,
      limit: 100,
    },
    { enabled: !!selectedApplicationId }
  );
  const { data: transcript } = trpc.voximplant.getTranscript.useQuery(
    { callId: selectedCallId! },
    { enabled: !!selectedCallId && isTranscriptDialogOpen }
  );

  const syncMutation = trpc.voximplant.syncCalls.useMutation();
  const utils = trpc.useUtils();

  const handleSyncCalls = async () => {
    if (!selectedApplicationId) return;

    try {
      const result = await syncMutation.mutateAsync({
        applicationId: selectedApplicationId,
      });

      toast({
        title: 'Sync complete',
        description: `Synced ${result.count} calls from Voximplant`,
      });

      utils.voximplant.getCalls.invalidate();
    } catch (error: any) {
      toast({
        title: 'Sync failed',
        description: error.message || 'Failed to sync calls',
        variant: 'destructive',
      });
    }
  };

  const handleViewTranscript = (callId: number) => {
    setSelectedCallId(callId);
    setIsTranscriptDialogOpen(true);
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '-';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatCost = (cents: number | null) => {
    if (!cents) return '-';
    return `$${(cents / 100).toFixed(2)}`;
  };

  const formatTimestamp = (timestamp: number | null) => {
    if (!timestamp) return '-';
    return new Date(timestamp * 1000).toLocaleString();
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'destructive' | 'secondary'> = {
      answered: 'default',
      failed: 'destructive',
      busy: 'secondary',
      'no-answer': 'secondary',
    };
    return <Badge variant={variants[status] || 'secondary'}>{status}</Badge>;
  };

  if (!accounts || accounts.length === 0) {
    return (
      <div className="container max-w-4xl py-8">
        <Card>
          <CardHeader>
            <CardTitle>No Voximplant Account</CardTitle>
            <CardDescription>
              You need to set up a Voximplant account first.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-7xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Call History</h1>
        <p className="text-muted-foreground mt-2">
          View and manage call history from your Voximplant applications
        </p>
      </div>

      {/* Filters */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <div className="space-y-2">
          <Label>Voximplant Account</Label>
          <Select
            value={selectedAccountId?.toString()}
            onValueChange={(value) => {
              setSelectedAccountId(parseInt(value));
              setSelectedApplicationId(null);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select account" />
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

        <div className="space-y-2">
          <Label>Application</Label>
          <Select
            value={selectedApplicationId?.toString()}
            onValueChange={(value) => setSelectedApplicationId(parseInt(value))}
            disabled={!selectedAccountId}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select application" />
            </SelectTrigger>
            <SelectContent>
              {applications?.map((app) => (
                <SelectItem key={app.id} value={app.id.toString()}>
                  {app.applicationName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-end">
          <Button
            onClick={handleSyncCalls}
            disabled={!selectedApplicationId || syncMutation.isPending}
          >
            {syncMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Sync Calls
          </Button>
        </div>
      </div>

      {/* Calls Table */}
      {callsLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : calls && calls.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {calls.map((call) => (
                  <TableRow key={call.id}>
                    <TableCell>{formatTimestamp(call.startTime)}</TableCell>
                    <TableCell>{call.fromNumber || '-'}</TableCell>
                    <TableCell>{call.toNumber}</TableCell>
                    <TableCell>{formatDuration(call.duration)}</TableCell>
                    <TableCell>{formatCost(call.cost)}</TableCell>
                    <TableCell>{getStatusBadge(call.status)}</TableCell>
                    <TableCell>
                      {call.hasTranscript && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewTranscript(call.id)}
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          Transcript
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : selectedApplicationId ? (
        <Card>
          <CardHeader>
            <CardTitle>No Calls</CardTitle>
            <CardDescription>
              No calls found for this application. Click "Sync Calls" to fetch call history from
              Voximplant.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {/* Transcript Dialog */}
      <Dialog open={isTranscriptDialogOpen} onOpenChange={setIsTranscriptDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Call Transcript</DialogTitle>
            <DialogDescription>
              Conversation transcript from ElevenLabs agent
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-auto max-h-[60vh]">
            {transcript ? (
              <div className="space-y-4">
                {JSON.parse(transcript.transcriptData).map((item: any, index: number) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg ${
                      item.role === 'agent' ? 'bg-primary/10' : 'bg-muted'
                    }`}
                  >
                    <div className="font-semibold text-sm mb-1">
                      {item.role === 'agent' ? 'Agent' : 'User'}
                    </div>
                    <div className="text-sm">{item.message}</div>
                    {item.timestamp && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {new Date(item.timestamp).toLocaleTimeString()}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
