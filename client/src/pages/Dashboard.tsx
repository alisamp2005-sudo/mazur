import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Phone, PhoneCall, PhoneOff, Clock, CheckCircle2, XCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { OperatorStatusPanel } from "@/components/OperatorStatusPanel";
import { QueueManagerPanel } from "@/components/QueueManagerPanel";

export default function Dashboard() {
  const { data: callStats, isLoading: statsLoading } = trpc.calls.stats.useQuery();
  const { data: queueStats, isLoading: queueLoading } = trpc.queue.stats.useQuery();
  const { data: recentCalls, isLoading: callsLoading } = trpc.calls.list.useQuery({ limit: 10, offset: 0 });

  if (statsLoading || queueLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-2">Overview of your calling campaigns</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const stats = [
    {
      title: "Total Calls",
      value: callStats?.total || 0,
      icon: Phone,
      description: "All time calls",
    },
    {
      title: "Completed",
      value: callStats?.done || 0,
      icon: CheckCircle2,
      description: "Successfully completed",
      color: "text-green-600",
    },
    {
      title: "In Progress",
      value: (callStats?.initiated || 0) + (callStats?.inProgress || 0) + (callStats?.processing || 0),
      icon: PhoneCall,
      description: "Currently active",
      color: "text-blue-600",
    },
    {
      title: "Failed",
      value: callStats?.failed || 0,
      icon: PhoneOff,
      description: "Failed attempts",
      color: "text-red-600",
    },
  ];

  const queueItems = [
    {
      title: "Queue Waiting",
      value: queueStats?.waiting || 0,
      icon: Clock,
      description: "Calls in queue",
    },
    {
      title: "Processing",
      value: queueStats?.processing || 0,
      icon: PhoneCall,
      description: "Currently calling",
      color: "text-blue-600",
    },
    {
      title: "Queue Completed",
      value: queueStats?.completed || 0,
      icon: CheckCircle2,
      description: "Processed from queue",
      color: "text-green-600",
    },
    {
      title: "Queue Failed",
      value: queueStats?.failed || 0,
      icon: XCircle,
      description: "Failed in queue",
      color: "text-red-600",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-2">Overview of your calling campaigns</p>
      </div>

      {/* Call Statistics */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Call Statistics</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <stat.icon className={`h-4 w-4 ${stat.color || "text-muted-foreground"}`} />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${stat.color || ""}`}>{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Queue Statistics */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Queue Status</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {queueItems.map((item) => (
            <Card key={item.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{item.title}</CardTitle>
                <item.icon className={`h-4 w-4 ${item.color || "text-muted-foreground"}`} />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${item.color || ""}`}>{item.value}</div>
                <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

        {/* Queue Manager Panel */}
        <QueueManagerPanel />

        {/* Operator Status Panel (Legacy) */}
        {/* <OperatorStatusPanel /> */}

      {/* Recent Calls */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Recent Calls</h2>
        <Card>
          <CardHeader>
            <CardTitle>Latest 10 Calls</CardTitle>
            <CardDescription>Most recent outbound calls</CardDescription>
          </CardHeader>
          <CardContent>
            {callsLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : recentCalls && recentCalls.length > 0 ? (
              <div className="space-y-2">
                {recentCalls.map((call) => (
                  <div
                    key={call.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${getStatusColor(call.status)}`}>
                        {getStatusIcon(call.status)}
                      </div>
                      <div>
                        <p className="font-medium">{call.toNumber}</p>
                        <p className="text-sm text-muted-foreground">
                          {call.createdAt ? new Date(call.createdAt).toLocaleString() : "N/A"}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(call.status)}`}>
                        {call.status}
                      </span>
                      {call.duration && (
                        <p className="text-sm text-muted-foreground mt-1">{call.duration}s</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">No calls yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function getStatusIcon(status: string) {
  switch (status) {
    case "done":
      return <CheckCircle2 className="h-4 w-4" />;
    case "failed":
      return <XCircle className="h-4 w-4" />;
    case "in-progress":
    case "processing":
      return <PhoneCall className="h-4 w-4" />;
    default:
      return <Clock className="h-4 w-4" />;
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case "done":
      return "bg-green-100 text-green-600";
    case "failed":
      return "bg-red-100 text-red-600";
    case "in-progress":
    case "processing":
      return "bg-blue-100 text-blue-600";
    default:
      return "bg-gray-100 text-gray-600";
  }
}

function getStatusBadgeColor(status: string) {
  switch (status) {
    case "done":
      return "bg-green-100 text-green-800";
    case "failed":
      return "bg-red-100 text-red-800";
    case "in-progress":
    case "processing":
      return "bg-blue-100 text-blue-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}
