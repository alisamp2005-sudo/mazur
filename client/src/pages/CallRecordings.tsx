import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, RefreshCw, Play, Pause, FileText } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function CallRecordings() {
  const [selectedCall, setSelectedCall] = useState<any | null>(null);
  const [transcriptDialogOpen, setTranscriptDialogOpen] = useState(false);
  const [playingCallId, setPlayingCallId] = useState<number | null>(null);

  const { data: calls, isLoading, refetch } = trpc.recordings.list.useQuery({ limit: 100, offset: 0 });
  const syncMutation = trpc.recordings.syncFromElevenLabs.useMutation({
    onSuccess: (result) => {
      toast.success(`Synced ${result.imported} recordings from ElevenLabs`);
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to sync: ${error.message}`);
    },
  });

  const handleSync = () => {
    syncMutation.mutate();
  };

  const handleViewTranscript = (call: any) => {
    setSelectedCall(call);
    setTranscriptDialogOpen(true);
  };

  const formatDuration = (seconds?: number | null) => {
    if (!seconds) return "N/A";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (timestamp?: number | null) => {
    if (!timestamp) return "N/A";
    return new Date(timestamp * 1000).toLocaleString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'done':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'processing':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Call Recordings</h1>
          <p className="text-muted-foreground mt-2">View and manage call recordings with transcripts</p>
        </div>
        <Button onClick={handleSync} disabled={syncMutation.isPending}>
          <RefreshCw className={`h-4 w-4 mr-2 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
          Sync from ElevenLabs
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recordings ({calls?.total || 0})</CardTitle>
          <CardDescription>All call recordings imported from ElevenLabs</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : calls && calls.calls.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Phone Number</TableHead>
                  <TableHead>Agent</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {calls.calls.map((call) => (
                  <TableRow key={call.id}>
                    <TableCell>{formatDate(call.startTime)}</TableCell>
                    <TableCell className="font-mono">{call.toNumber}</TableCell>
                    <TableCell>{call.agentName || 'Unknown'}</TableCell>
                    <TableCell>{formatDuration(call.duration)}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(call.status)}`}>
                        {call.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {call.hasAudio && call.audioUrl && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const audio = new Audio(call.audioUrl || '');
                              if (playingCallId === call.id) {
                                audio.pause();
                                setPlayingCallId(null);
                              } else {
                                audio.play();
                                setPlayingCallId(call.id);
                                audio.onended = () => setPlayingCallId(null);
                              }
                            }}
                          >
                            {playingCallId === call.id ? (
                              <Pause className="h-4 w-4" />
                            ) : (
                              <Play className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                        {call.hasAudio && call.audioUrl && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const link = document.createElement('a');
                              link.href = call.audioUrl || '';
                              link.download = `call-${call.id}.mp3`;
                              link.click();
                            }}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                        {call.hasTranscript && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewTranscript(call)}
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No recordings found</p>
              <p className="text-sm mt-2">Click "Sync from ElevenLabs" to import recordings</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transcript Dialog */}
      <Dialog open={transcriptDialogOpen} onOpenChange={setTranscriptDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Call Transcript</DialogTitle>
            <DialogDescription>
              Call with {selectedCall?.toNumber} on {formatDate(selectedCall?.startTime)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedCall?.transcript && selectedCall.transcript.length > 0 ? (
              selectedCall.transcript.map((item: any, index: number) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg ${
                    item.role === 'agent'
                      ? 'bg-blue-50 dark:bg-blue-950 ml-4'
                      : 'bg-gray-50 dark:bg-gray-900 mr-4'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold">
                      {item.role === 'agent' ? '🤖 AI Agent' : '👤 Client'}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {formatDuration(item.timeInCallSecs)}
                    </span>
                  </div>
                  <p className="text-sm">{item.message}</p>
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground">No transcript available</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
