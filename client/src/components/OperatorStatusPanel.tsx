import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Loader2, Play, Pause, Power, PowerOff } from "lucide-react";
import { toast } from "sonner";

export function OperatorStatusPanel() {
  const utils = trpc.useUtils();
  
  // Query operator statuses
  const { data: operatorStatuses, isLoading: loadingStatuses } = trpc.tcx.getOperatorStatuses.useQuery(
    undefined,
    { refetchInterval: 5000 } // Refresh every 5 seconds
  );

  // Query auto management status
  const { data: autoStatus, isLoading: loadingAutoStatus } = trpc.queueControl.getAutoManagementStatus.useQuery(
    undefined,
    { refetchInterval: 5000 }
  );

  // Query queue status
  const { data: queueStatus } = trpc.queue.status.useQuery(
    undefined,
    { refetchInterval: 5000 }
  );

  // Mutations
  const startAutoManagement = trpc.queueControl.startAutoManagement.useMutation({
    onSuccess: () => {
      toast.success("Automatic queue management started");
      utils.queueControl.getAutoManagementStatus.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to start: ${error.message}`);
    },
  });

  const stopAutoManagement = trpc.queueControl.stopAutoManagement.useMutation({
    onSuccess: () => {
      toast.success("Automatic queue management stopped");
      utils.queueControl.getAutoManagementStatus.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to stop: ${error.message}`);
    },
  });

  const pauseQueue = trpc.queueControl.pause.useMutation({
    onSuccess: () => {
      toast.success("Queue paused");
      utils.queue.status.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to pause: ${error.message}`);
    },
  });

  const resumeQueue = trpc.queueControl.resume.useMutation({
    onSuccess: () => {
      toast.success("Queue resumed");
      utils.queue.status.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to resume: ${error.message}`);
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Available":
        return <Badge variant="default" className="bg-green-500">Available</Badge>;
      case "Busy":
        return <Badge variant="destructive">Busy</Badge>;
      case "Ringing":
        return <Badge variant="secondary" className="bg-blue-500">Ringing</Badge>;
      case "OnHold":
        return <Badge variant="secondary" className="bg-yellow-500">On Hold</Badge>;
      case "Offline":
        return <Badge variant="outline">Offline</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Automatic Management Control */}
      <Card>
        <CardHeader>
          <CardTitle>Automatic Queue Management</CardTitle>
          <CardDescription>
            Automatically pause/resume queue based on operator availability
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {loadingAutoStatus ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : autoStatus?.isRunning ? (
                <Power className="h-4 w-4 text-green-500" />
              ) : (
                <PowerOff className="h-4 w-4 text-gray-400" />
              )}
              <span className="font-medium">
                Status: {autoStatus?.isRunning ? "Active" : "Inactive"}
              </span>
              {autoStatus?.isRunning && (
                <Badge variant="secondary">
                  {autoStatus.lastState === "paused" ? "Queue Paused" : "Queue Active"}
                </Badge>
              )}
            </div>
            <div className="flex gap-2">
              {autoStatus?.isRunning ? (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => stopAutoManagement.mutate()}
                  disabled={stopAutoManagement.isPending}
                >
                  {stopAutoManagement.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Stop Auto Management
                </Button>
              ) : (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => startAutoManagement.mutate()}
                  disabled={startAutoManagement.isPending}
                >
                  {startAutoManagement.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Start Auto Management
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Manual Queue Control */}
      <Card>
        <CardHeader>
          <CardTitle>Manual Queue Control</CardTitle>
          <CardDescription>
            Manually pause or resume the call queue
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-medium">Queue Status:</span>
              {queueStatus && 'isPaused' in queueStatus && queueStatus.isPaused ? (
                <Badge variant="destructive">Paused</Badge>
              ) : (
                <Badge variant="default" className="bg-green-500">Active</Badge>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => pauseQueue.mutate()}
                disabled={pauseQueue.isPending || (queueStatus && 'isPaused' in queueStatus && queueStatus.isPaused)}
              >
                {pauseQueue.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Pause className="mr-2 h-4 w-4" />
                )}
                Pause
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => resumeQueue.mutate()}
                disabled={resumeQueue.isPending || !(queueStatus && 'isPaused' in queueStatus && queueStatus.isPaused)}
              >
                {resumeQueue.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Play className="mr-2 h-4 w-4" />
                )}
                Resume
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Operator Statuses */}
      <Card>
        <CardHeader>
          <CardTitle>Operator Status</CardTitle>
          <CardDescription>
            Real-time status of all operators (Extensions: 1000, 2000, 3000, 4000)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingStatuses ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : operatorStatuses && operatorStatuses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {operatorStatuses.map((op) => (
                <div
                  key={op.extension}
                  className="border rounded-lg p-4 space-y-2"
                >
                  <div className="font-semibold text-lg">Ext {op.extension}</div>
                  {getStatusBadge(op.status)}
                  <div className="text-xs text-muted-foreground">
                    Updated: {new Date(op.lastUpdated).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No operator status data available. Start auto management to begin monitoring.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
