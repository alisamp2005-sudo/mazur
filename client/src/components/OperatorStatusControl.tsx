import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Phone, PhoneOff } from "lucide-react";
import { toast } from "sonner";

const EXTENSIONS = ["1000", "2000", "3000", "4000"];

export function OperatorStatusControl() {
  const utils = trpc.useUtils();
  const { data: statuses } = trpc.tcx.getOperatorStatuses.useQuery(undefined, {
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  const setAvailable = trpc.tcx.setOperatorAvailable.useMutation({
    onSuccess: (data) => {
      toast.success(`Extension ${data.extension} marked as Available`);
      utils.tcx.getOperatorStatuses.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to update status: ${error.message}`);
    },
  });

  const getStatus = (extension: string) => {
    return statuses?.find((s) => s.extension === extension);
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground mr-2">Operators:</span>
      {EXTENSIONS.map((ext) => {
        const status = getStatus(ext);
        const isBusy = status?.status === "Busy" || status?.status === "Ringing";

        return (
          <Button
            key={ext}
            size="sm"
            variant={isBusy ? "destructive" : "outline"}
            onClick={() => setAvailable.mutate({ extension: ext })}
            disabled={setAvailable.isPending}
            className="gap-2"
          >
            {isBusy ? (
              <Phone className="h-4 w-4" />
            ) : (
              <PhoneOff className="h-4 w-4" />
            )}
            {ext}
          </Button>
        );
      })}
    </div>
  );
}
