import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { FileText, Plus, CheckCircle2, TrendingUp, BarChart3 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function PromptManager() {
  const { toast } = useToast();
  const [selectedAgentId, setSelectedAgentId] = useState<number | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newPromptText, setNewPromptText] = useState("");
  const [newFirstMessage, setNewFirstMessage] = useState("");
  const [newDescription, setNewDescription] = useState("");

  const { data: agents } = trpc.agents.list.useQuery();
  const { data: promptVersions, refetch: refetchPrompts } = trpc.prompts.list.useQuery(
    { agentId: selectedAgentId! },
    { enabled: !!selectedAgentId }
  );

  const createPrompt = trpc.prompts.create.useMutation({
    onSuccess: () => {
      toast({
        title: "Prompt version created",
        description: "New prompt version has been saved successfully.",
      });
      setShowCreateForm(false);
      setNewPromptText("");
      setNewFirstMessage("");
      setNewDescription("");
      refetchPrompts();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const setActive = trpc.prompts.setActive.useMutation({
    onSuccess: () => {
      toast({
        title: "Active prompt updated",
        description: "The selected prompt version is now active.",
      });
      refetchPrompts();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCreatePrompt = () => {
    if (!selectedAgentId || !newPromptText) {
      toast({
        title: "Missing information",
        description: "Please select an agent and provide prompt text.",
        variant: "destructive",
      });
      return;
    }

    createPrompt.mutate({
      agentId: selectedAgentId,
      promptText: newPromptText,
      firstMessage: newFirstMessage || undefined,
      description: newDescription || undefined,
    });
  };

  const handleSetActive = (versionId: number) => {
    if (!selectedAgentId) return;
    setActive.mutate({
      agentId: selectedAgentId,
      versionId,
    });
  };

  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Prompt Manager</h1>
          <p className="text-muted-foreground mt-1">
            Manage and optimize agent prompts with version control
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select Agent</CardTitle>
          <CardDescription>Choose an agent to manage its prompts</CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={selectedAgentId?.toString() || ""}
            onValueChange={(value) => setSelectedAgentId(parseInt(value))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select an agent..." />
            </SelectTrigger>
            <SelectContent>
              {agents?.map((agent) => (
                <SelectItem key={agent.id} value={agent.id.toString()}>
                  {agent.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedAgentId && (
        <>
          <div className="flex justify-end">
            <Button onClick={() => setShowCreateForm(!showCreateForm)}>
              <Plus className="mr-2 h-4 w-4" />
              Create New Version
            </Button>
          </div>

          {showCreateForm && (
            <Card>
              <CardHeader>
                <CardTitle>Create New Prompt Version</CardTitle>
                <CardDescription>
                  Add a new version of the agent prompt
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="description">Version Description</Label>
                  <Input
                    id="description"
                    placeholder="e.g., Added more empathy, improved call transfer logic"
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="promptText">Prompt Text *</Label>
                  <Textarea
                    id="promptText"
                    placeholder="Enter the agent's system prompt..."
                    value={newPromptText}
                    onChange={(e) => setNewPromptText(e.target.value)}
                    rows={8}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="firstMessage">First Message</Label>
                  <Input
                    id="firstMessage"
                    placeholder="e.g., Hello! How can I help you today?"
                    value={newFirstMessage}
                    onChange={(e) => setNewFirstMessage(e.target.value)}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowCreateForm(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreatePrompt}
                    disabled={createPrompt.isPending || !newPromptText}
                  >
                    {createPrompt.isPending ? "Creating..." : "Create Version"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Prompt Versions</h2>
            {promptVersions && promptVersions.length > 0 ? (
              promptVersions.map((version) => (
                <Card key={version.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-lg">
                            Version {version.version}
                          </CardTitle>
                          {version.isActive && (
                            <Badge variant="default" className="bg-green-500">
                              <CheckCircle2 className="mr-1 h-3 w-3" />
                              Active
                            </Badge>
                          )}
                        </div>
                        {version.description && (
                          <CardDescription>{version.description}</CardDescription>
                        )}
                      </div>
                      {!version.isActive && (
                        <Button
                          size="sm"
                          onClick={() => handleSetActive(version.id)}
                          disabled={setActive.isPending}
                        >
                          Set Active
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Prompt Text</Label>
                      <div className="bg-muted p-3 rounded-md">
                        <pre className="text-sm whitespace-pre-wrap font-mono">
                          {version.promptText}
                        </pre>
                      </div>
                    </div>

                    {version.firstMessage && (
                      <div className="space-y-2">
                        <Label>First Message</Label>
                        <p className="text-sm text-muted-foreground">
                          {version.firstMessage}
                        </p>
                      </div>
                    )}

                    <div className="grid gap-4 md:grid-cols-3 pt-4 border-t">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">Calls</p>
                          <p className="text-lg font-semibold">{version.callCount}</p>
                        </div>
                      </div>
                      {version.avgRating && (
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm text-muted-foreground">Avg Rating</p>
                            <p className="text-lg font-semibold">
                              {(version.avgRating / 100).toFixed(2)}/5
                            </p>
                          </div>
                        </div>
                      )}
                      {version.successRate && (
                        <div className="flex items-center gap-2">
                          <BarChart3 className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm text-muted-foreground">Success Rate</p>
                            <p className="text-lg font-semibold">
                              {(version.successRate / 100).toFixed(0)}%
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="text-xs text-muted-foreground">
                      Created {new Date(version.createdAt).toLocaleString()}
                      {version.createdBy && ` by ${version.createdBy}`}
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground">
                    No prompt versions yet. Create your first version above.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </>
      )}
    </div>
  );
}
