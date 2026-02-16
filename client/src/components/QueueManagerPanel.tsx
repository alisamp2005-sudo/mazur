import React from "react";
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

  const { isActive, operators, queueStatus, autoManagement } = status;
  const { total, available, busy, extensions } = operators;
  const isAnyAvailable = available > 0;

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
                <div className="text-2xl font-bold">{total}</div>
                <div className="text-sm text-muted-foreground">Total</div>
              </div>
              <div className="text-center p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {available}
                </div>
                <div className="text-sm text-muted-foreground">Available</div>
              </div>
              <div className="text-center p-4 bg-red-50 dark:bg-red-950 rounded-lg">
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {busy}
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

      {/* Active Extensions Configuration */}
      <ActiveExtensionsConfig />
    </div>
  );
}

// Active Extensions Configuration Component
function ActiveExtensionsConfig() {
  const AVAILABLE_EXTENSIONS = ['1000', '2000', '3000', '4000'];
  const [activeExtensions, setActiveExtensions] = React.useState<string[]>([]);

  const { data, refetch } = trpc.settings.getActiveExtensions.useQuery();
  const saveMutation = trpc.settings.setActiveExtensions.useMutation({
    onSuccess: () => {
      toast.success("Active extensions updated");
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to update: ${error.message}`);
    },
  });

  React.useEffect(() => {
    if (data?.extensions) {
      const exts = data.extensions.split(',').map(e => e.trim()).filter(Boolean);
      setActiveExtensions(exts);
    }
  }, [data]);

  const toggleExtension = (ext: string) => {
    const newActive = activeExtensions.includes(ext)
      ? activeExtensions.filter(e => e !== ext)
      : [...activeExtensions, ext];
    setActiveExtensions(newActive);
    saveMutation.mutate({ extensions: newActive.join(',') });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Active Extensions
        </CardTitle>
        <CardDescription>
          Configure which 3CX extensions to monitor for availability
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-3">
            {AVAILABLE_EXTENSIONS.map((ext) => {
              const isActive = activeExtensions.includes(ext);
              return (
                <div key={ext} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="font-mono font-medium text-lg">{ext}</div>
                    <Badge variant={isActive ? "default" : "outline"}>
                      {isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <button
                    onClick={() => toggleExtension(ext)}
                    disabled={saveMutation.isPending}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                      isActive ? 'bg-blue-600' : 'bg-gray-200'
                    } ${saveMutation.isPending ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        isActive ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              );
            })}
          </div>
          <div className="text-xs text-muted-foreground p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
            <strong>Note:</strong> Only extensions listed here will be monitored. Unregistered
            extensions will be ignored even if listed.
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
