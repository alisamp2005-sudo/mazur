import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Phone, Loader2 } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function SingleCall() {
  const { toast } = useToast();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");

  const { data: agents, isLoading: agentsLoading } = trpc.agents.list.useQuery();
  const createCall = trpc.calls.createSingleCall.useMutation({
    onSuccess: (data) => {
      toast({
        title: "Call Initiated",
        description: `Call to ${phoneNumber} has been initiated successfully.`,
      });
      setPhoneNumber("");
    },
    onError: (error) => {
      toast({
        title: "Call Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedAgentId) {
      toast({
        title: "Agent Required",
        description: "Please select an agent to make the call.",
        variant: "destructive",
      });
      return;
    }

    if (!phoneNumber.trim()) {
      toast({
        title: "Phone Number Required",
        description: "Please enter a phone number.",
        variant: "destructive",
      });
      return;
    }

    createCall.mutate({
      agentId: parseInt(selectedAgentId),
      phoneNumber: phoneNumber.trim(),
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Make a Call</h1>
        <p className="text-muted-foreground mt-2">Initiate a single outbound call to test your agents</p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Single Call</CardTitle>
          <CardDescription>
            Enter a phone number and select an agent to make a test call. Use E.164 format (e.g., +1234567890).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="agent">Agent</Label>
              <Select
                value={selectedAgentId}
                onValueChange={setSelectedAgentId}
                disabled={agentsLoading || createCall.isPending}
              >
                <SelectTrigger id="agent">
                  <SelectValue placeholder="Select an agent" />
                </SelectTrigger>
                <SelectContent>
                  {agents?.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id.toString()}>
                      {agent.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {agentsLoading && (
                <p className="text-sm text-muted-foreground">Loading agents...</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+1234567890"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                disabled={createCall.isPending}
              />
              <p className="text-sm text-muted-foreground">
                Use E.164 format with country code (e.g., +1 for US, +44 for UK)
              </p>
            </div>

            <Button
              type="submit"
              disabled={createCall.isPending || !selectedAgentId || !phoneNumber.trim()}
              className="w-full"
            >
              {createCall.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Initiating Call...
                </>
              ) : (
                <>
                  <Phone className="mr-2 h-4 w-4" />
                  Make Call
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Phone Number Format Guide</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-medium">United States</p>
              <p className="text-muted-foreground">+1234567890</p>
            </div>
            <div>
              <p className="font-medium">United Kingdom</p>
              <p className="text-muted-foreground">+441234567890</p>
            </div>
            <div>
              <p className="font-medium">Canada</p>
              <p className="text-muted-foreground">+1234567890</p>
            </div>
            <div>
              <p className="font-medium">Australia</p>
              <p className="text-muted-foreground">+61234567890</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            Always include the country code prefix (e.g., +1, +44, +61) without spaces or special characters.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
