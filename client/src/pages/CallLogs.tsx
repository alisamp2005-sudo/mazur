import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Phone, Clock, CheckCircle2, XCircle, PhoneCall, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CallLogs() {
  const [selectedCallId, setSelectedCallId] = useState<number | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const { data: calls, isLoading, refetch } = trpc.calls.list.useQuery({ limit: 100, offset: 0 });

  // Auto-refresh every 5 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      refetch();
    }, 5000);

    return () => clearInterval(interval);
  }, [autoRefresh, refetch]);
  const { data: callDetails } = trpc.calls.get.useQuery(
    { id: selectedCallId! },
    { enabled: !!selectedCallId }
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Call Logs</h1>
          <p className="text-muted-foreground mt-2">View all call history and transcripts</p>
        </div>
        <Button
          variant={autoRefresh ? "default" : "outline"}
          onClick={() => setAutoRefresh(!autoRefresh)}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
          {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Calls</CardTitle>
          <CardDescription>Complete call history with status and duration</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : calls && calls.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Phone Number</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Start Time</TableHead>
                  <TableHead>Transcript</TableHead>
                  <TableHead>Audio</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {calls.map((call) => (
                  <TableRow key={call.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(call.status)}
                        <span className={`text-xs font-medium ${getStatusTextColor(call.status)}`}>
                          {call.status}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono">{call.toNumber}</TableCell>
                    <TableCell>
                      {call.duration ? `${call.duration}s` : <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell className="text-sm">
                      {call.startTime
                        ? new Date(call.startTime * 1000).toLocaleString()
                        : call.createdAt
                        ? new Date(call.createdAt).toLocaleString()
                        : "N/A"}
                    </TableCell>
                    <TableCell>
                      {call.hasTranscript ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-gray-400" />
                      )}
                    </TableCell>
                    <TableCell>
                      {call.hasAudio ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-gray-400" />
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedCallId(call.id)}
                        disabled={!call.hasTranscript && !call.hasAudio}
                      >
                        View Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <Phone className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No calls yet</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Call Details Dialog */}
      <Dialog open={!!selectedCallId} onOpenChange={(open) => !open && setSelectedCallId(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Call Details</DialogTitle>
          </DialogHeader>
          {callDetails && (
            <div className="space-y-6">
              {/* Call Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Phone Number</p>
                  <p className="font-mono">{callDetails.call.toNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <p className="font-medium">{callDetails.call.status}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Duration</p>
                  <p>{callDetails.call.duration ? `${callDetails.call.duration}s` : "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Start Time</p>
                  <p className="text-sm">
                    {callDetails.call.startTime
                      ? new Date(callDetails.call.startTime * 1000).toLocaleString()
                      : "N/A"}
                  </p>
                </div>
              </div>

              {/* Audio Player */}
              {callDetails.call.hasAudio && callDetails.call.audioPath && (
                <div>
                  <p className="text-sm font-medium mb-2">Call Recording</p>
                  <audio controls className="w-full">
                    <source src={`/api/audio/${callDetails.call.conversationId}`} type="audio/mpeg" />
                    Your browser does not support the audio element.
                  </audio>
                </div>
              )}

              {/* Transcript */}
              {callDetails.transcripts && callDetails.transcripts.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-3">Transcript</p>
                  <div className="space-y-3 bg-muted/30 rounded-lg p-4 max-h-96 overflow-y-auto">
                    {callDetails.transcripts.map((transcript, index) => (
                      <div
                        key={index}
                        className={`flex gap-3 ${
                          transcript.role === "agent" ? "justify-start" : "justify-end"
                        }`}
                      >
                        <div
                          className={`max-w-[80%] rounded-lg p-3 ${
                            transcript.role === "agent"
                              ? "bg-blue-100 text-blue-900"
                              : "bg-green-100 text-green-900"
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-semibold uppercase">
                              {transcript.role === "agent" ? "AI Agent" : "Customer"}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {transcript.timeInCallSecs}s
                            </span>
                          </div>
                          <p className="text-sm">{transcript.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!callDetails.call.hasTranscript && !callDetails.call.hasAudio && (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No transcript or audio available yet</p>
                  <p className="text-sm mt-2">Data will appear after the call is processed</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function getStatusIcon(status: string) {
  switch (status) {
    case "done":
      return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    case "failed":
      return <XCircle className="h-4 w-4 text-red-600" />;
    case "in-progress":
    case "processing":
      return <PhoneCall className="h-4 w-4 text-blue-600" />;
    default:
      return <Clock className="h-4 w-4 text-gray-600" />;
  }
}

function getStatusTextColor(status: string) {
  switch (status) {
    case "done":
      return "text-green-600";
    case "failed":
      return "text-red-600";
    case "in-progress":
    case "processing":
      return "text-blue-600";
    default:
      return "text-gray-600";
  }
}
