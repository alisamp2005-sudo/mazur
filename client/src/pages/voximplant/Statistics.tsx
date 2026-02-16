import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Phone, CheckCircle2, XCircle, Clock, DollarSign } from 'lucide-react';

export default function VoximplantStatistics() {
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [selectedApplicationId, setSelectedApplicationId] = useState<number | null>(null);

  const { data: accounts } = trpc.voximplant.getAccounts.useQuery();
  const { data: applications } = trpc.voximplant.getApplications.useQuery(
    { voximplantAccountId: selectedAccountId! },
    { enabled: !!selectedAccountId }
  );
  const { data: stats, isLoading: statsLoading } = trpc.voximplant.getStats.useQuery(
    { applicationId: selectedApplicationId! },
    { enabled: !!selectedApplicationId }
  );

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${mins}m ${secs}s`;
    }
    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
  };

  const formatCost = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
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
        <h1 className="text-3xl font-bold">Statistics</h1>
        <p className="text-muted-foreground mt-2">
          View call statistics and analytics for your Voximplant applications
        </p>
      </div>

      {/* Filters */}
      <div className="grid gap-4 md:grid-cols-2 mb-6">
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
      </div>

      {/* Statistics Cards */}
      {statsLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : stats ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
              <Phone className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalCalls}</div>
              <p className="text-xs text-muted-foreground">
                All calls made through this application
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Answered Calls</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.answeredCalls}</div>
              <p className="text-xs text-muted-foreground">
                Successfully connected calls
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Failed Calls</CardTitle>
              <XCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.failedCalls}</div>
              <p className="text-xs text-muted-foreground">
                Calls that failed to connect
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.successRate}%</div>
              <p className="text-xs text-muted-foreground">
                Percentage of successful calls
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Duration</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatDuration(stats.totalDuration)}</div>
              <p className="text-xs text-muted-foreground">
                Combined duration of all calls
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Duration</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatDuration(stats.avgDuration)}</div>
              <p className="text-xs text-muted-foreground">
                Average call duration
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCost(stats.totalCost)}</div>
              <p className="text-xs text-muted-foreground">
                Total cost of all calls
              </p>
            </CardContent>
          </Card>
        </div>
      ) : selectedApplicationId ? (
        <Card>
          <CardHeader>
            <CardTitle>No Data</CardTitle>
            <CardDescription>
              No statistics available for this application yet.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}
    </div>
  );
}
