import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Play, Pause, Users, Activity } from "lucide-react";
import { toast } from "sonner";

export function QueueManagerPanel() {
  const { data: status, refetch } = trpc.queueManager.getStatus.useQuery(undefined, {
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  const startMutation = trpc.queueManager.start.useMutation({
    onSuccess: () => {
      toast.success("Queue Manager started");
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to start: ${error.message}`);
    },
  });

  const stopMutation = trpc.queueManager.stop.useMutation({
    onSuccess: () => {
      toast.success("Queue Manager stopped");
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to stop: ${error.message}`);
    },
  });

  if (!status) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Queue Manager</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const { isActive, operatorStatus, queueStatus } = status;
  const { totalOperators, busyOperators, availableOperators, isAnyAvailable } = operatorStatus;

  return (
    <div className="space-y-4">
      {/* Queue Manager Control */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Automatic Queue Manager
              </CardTitle>
              <CardDescription>
                Automatically pauses batch calls when all operators are busy
              </CardDescription>
            </div>
            <Badge variant={isActive ? "default" : "secondary"}>
              {isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button
              onClick={() => startMutation.mutate()}
              disabled={isActive || startMutation.isPending}
              size="sm"
            >
              <Play className="h-4 w-4 mr-2" />
              Start
            </Button>
            <Button
              onClick={() => stopMutation.mutate()}
              disabled={!isActive || stopMutation.isPending}
              variant="outline"
              size="sm"
            >
              <Pause className="h-4 w-4 mr-2" />
              Stop
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Operator Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Operator Availability
          </CardTitle>
          <CardDescription>Real-time status of 3CX operators</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold">{totalOperators}</div>
                <div className="text-sm text-muted-foreground">Total</div>
              </div>
              <div className="text-center p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {availableOperators}
                </div>
                <div className="text-sm text-muted-foreground">Available</div>
              </div>
              <div className="text-center p-4 bg-red-50 dark:bg-red-950 rounded-lg">
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {busyOperators}
                </div>
                <div className="text-sm text-muted-foreground">Busy</div>
              </div>
            </div>

            {/* Status Indicator */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <span className="text-sm font-medium">Current Status:</span>
              <Badge variant={isAnyAvailable ? "default" : "destructive"} className="text-sm">
                {isAnyAvailable ? "✓ Operators Available" : "⚠ All Operators Busy"}
              </Badge>
            </div>

            {/* Queue Status */}
            {queueStatus && (
              <div className="space-y-2 p-4 bg-muted rounded-lg">
                <div className="text-sm font-medium">Queue Status:</div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Running:</span>{" "}
                    <Badge variant={queueStatus.isRunning ? "default" : "secondary"} className="ml-2">
                      {queueStatus.isRunning ? "Yes" : "No"}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Paused:</span>{" "}
                    <Badge variant={queueStatus.isPaused ? "destructive" : "default"} className="ml-2">
                      {queueStatus.isPaused ? "Yes" : "No"}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Active Workers:</span>{" "}
                    <span className="font-medium">{queueStatus.activeWorkers}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Max Concurrent:</span>{" "}
                    <span className="font-medium">{queueStatus.maxConcurrent}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Info */}
            <div className="text-xs text-muted-foreground p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
              <strong>How it works:</strong> When all operators are busy, the Queue Manager
              automatically pauses new batch calls. When an operator becomes available, calls resume
              automatically.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
