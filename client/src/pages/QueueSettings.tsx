import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { PlayCircle, StopCircle, Settings, Activity } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export default function QueueSettings() {
  const [maxConcurrent, setMaxConcurrent] = useState(3);

  const { data: queueStatus, refetch } = trpc.queue.status.useQuery(undefined, {
    refetchInterval: 2000, // Refresh every 2 seconds
  });
  
  const { data: queueStats } = trpc.queue.stats.useQuery(undefined, {
    refetchInterval: 2000,
  });

  const startMutation = trpc.queue.start.useMutation();
  const stopMutation = trpc.queue.stop.useMutation();
  const setMaxMutation = trpc.queue.setMaxConcurrent.useMutation();

  useEffect(() => {
    if (queueStatus) {
      setMaxConcurrent(queueStatus.maxConcurrent);
    }
  }, [queueStatus]);

  const handleStart = async () => {
    try {
      await startMutation.mutateAsync();
      toast.success("Queue processor started");
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Failed to start queue processor");
    }
  };

  const handleStop = async () => {
    try {
      await stopMutation.mutateAsync();
      toast.success("Queue processor stopped");
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Failed to stop queue processor");
    }
  };

  const handleSetMaxConcurrent = async () => {
    try {
      await setMaxMutation.mutateAsync({ max: maxConcurrent });
      toast.success(`Max concurrent calls set to ${maxConcurrent}`);
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Failed to update settings");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Queue Settings</h1>
        <p className="text-muted-foreground mt-2">Configure and monitor the call queue processor</p>
      </div>

      {/* Queue Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Queue Processor Status</CardTitle>
              <CardDescription>Current state of the call queue processor</CardDescription>
            </div>
            <Badge variant={queueStatus?.isRunning ? "default" : "secondary"} className="text-sm">
              {queueStatus?.isRunning ? (
                <>
                  <Activity className="h-3 w-3 mr-1 animate-pulse" />
                  Running
                </>
              ) : (
                <>
                  <StopCircle className="h-3 w-3 mr-1" />
                  Stopped
                </>
              )}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Active Workers</p>
              <p className="text-2xl font-bold">{queueStatus?.activeWorkers || 0}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Max Concurrent</p>
              <p className="text-2xl font-bold">{queueStatus?.maxConcurrent || 3}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">In Queue</p>
              <p className="text-2xl font-bold">{queueStats?.waiting || 0}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Processing</p>
              <p className="text-2xl font-bold">{queueStats?.processing || 0}</p>
            </div>
          </div>

          <div className="flex gap-2">
            {queueStatus?.isRunning ? (
              <Button
                variant="outline"
                onClick={handleStop}
                disabled={stopMutation.isPending}
              >
                <StopCircle className="h-4 w-4 mr-2" />
                {stopMutation.isPending ? "Stopping..." : "Stop Queue"}
              </Button>
            ) : (
              <Button
                onClick={handleStart}
                disabled={startMutation.isPending}
              >
                <PlayCircle className="h-4 w-4 mr-2" />
                {startMutation.isPending ? "Starting..." : "Start Queue"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Queue Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>
            <Settings className="h-5 w-5 inline mr-2" />
            Queue Configuration
          </CardTitle>
          <CardDescription>
            Adjust the number of parallel calls (1-{queueStatus?.maxAllowed || 15})
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="max-concurrent">Max Concurrent Calls</Label>
              <span className="text-2xl font-bold">{maxConcurrent}</span>
            </div>
            <Slider
              id="max-concurrent"
              min={1}
              max={queueStatus?.maxAllowed || 15}
              step={1}
              value={[maxConcurrent]}
              onValueChange={(value) => setMaxConcurrent(value[0])}
              className="w-full"
            />
            <p className="text-sm text-muted-foreground">
              This setting controls how many calls can be processed simultaneously. 
              Higher values increase throughput but require more resources.
            </p>
          </div>

          <Button
            onClick={handleSetMaxConcurrent}
            disabled={
              setMaxMutation.isPending ||
              maxConcurrent === queueStatus?.maxConcurrent
            }
          >
            {setMaxMutation.isPending ? "Applying..." : "Apply Settings"}
          </Button>
        </CardContent>
      </Card>

      {/* Queue Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Queue Statistics</CardTitle>
          <CardDescription>Overview of queue performance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total in Queue</p>
              <p className="text-2xl font-bold">{queueStats?.total || 0}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Waiting</p>
              <p className="text-2xl font-bold text-yellow-600">{queueStats?.waiting || 0}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Completed</p>
              <p className="text-2xl font-bold text-green-600">{queueStats?.completed || 0}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Failed</p>
              <p className="text-2xl font-bold text-red-600">{queueStats?.failed || 0}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <div className="text-blue-600 mt-0.5">
              <Activity className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <p className="font-medium text-blue-900">How it works</p>
              <p className="text-sm text-blue-800">
                The queue processor automatically picks up phone numbers from the queue and initiates calls 
                using the configured agents. You can adjust the number of parallel calls based on 
                your needs and available resources. The processor will continue running until manually stopped 
                or all queue items are processed.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
