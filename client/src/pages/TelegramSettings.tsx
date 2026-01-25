import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Send, Check, X } from "lucide-react";

export default function TelegramSettings() {
  const [botToken, setBotToken] = useState("");
  const [chatId, setChatId] = useState("");

  const { data: settings, isLoading, refetch } = trpc.telegram.getSettings.useQuery();
  const saveMutation = trpc.telegram.saveSettings.useMutation({
    onSuccess: () => {
      toast.success("Telegram settings saved successfully");
      refetch();
    },
    onError: (error: any) => {
      toast.error(`Failed to save settings: ${error.message}`);
    },
  });

  const testMutation = trpc.telegram.testConnection.useMutation({
    onSuccess: () => {
      toast.success("Test message sent successfully! Check your Telegram.");
    },
    onError: (error: any) => {
      toast.error(`Failed to send test message: ${error.message}`);
    },
  });

  const deleteMutation = trpc.telegram.deleteSettings.useMutation({
    onSuccess: () => {
      toast.success("Telegram integration disabled");
      setBotToken("");
      setChatId("");
      refetch();
    },
    onError: (error: any) => {
      toast.error(`Failed to disable: ${error.message}`);
    },
  });

  const handleSave = () => {
    if (!botToken.trim() || !chatId.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    saveMutation.mutate({
      botToken: botToken.trim(),
      chatId: chatId.trim(),
      isActive: true,
      sendRecordings: true,
      sendTranscripts: true,
    });
  };

  const handleTest = () => {
    if (!settings?.isActive) {
      toast.error("Please save settings first");
      return;
    }

    testMutation.mutate();
  };

  const handleDelete = () => {
    if (confirm("Are you sure you want to disable Telegram integration?")) {
      deleteMutation.mutate();
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Telegram Integration</h1>
        <p className="text-muted-foreground mt-2">
          Configure Telegram bot to receive call recordings and transcripts
        </p>
      </div>

      {settings?.isActive && (
        <Card className="border-green-500 bg-green-50 dark:bg-green-950">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-600" />
              Telegram Integration Active
            </CardTitle>
            <CardDescription>
              Call recordings and transcripts will be automatically sent to your Telegram chat
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Bot Configuration</CardTitle>
          <CardDescription>
            Create a Telegram bot using @BotFather and get your bot token and chat ID
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="botToken">Bot Token</Label>
            <Input
              id="botToken"
              type="password"
              placeholder="1234567890:ABCdefGHIjklMNOpqrsTUVwxyz"
              value={botToken || settings?.botToken || ""}
              onChange={(e) => setBotToken(e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              Get your bot token from @BotFather on Telegram
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="chatId">Chat ID</Label>
            <Input
              id="chatId"
              placeholder="-1001234567890"
              value={chatId || settings?.chatId || ""}
              onChange={(e) => setChatId(e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              Use @userinfobot to get your chat ID or group chat ID
            </p>
          </div>

          <div className="flex gap-2 pt-4">
            <Button onClick={handleSave} disabled={saveMutation.isPending}>
              Save Settings
            </Button>
            {settings?.isActive && (
              <>
                <Button
                  variant="outline"
                  onClick={handleTest}
                  disabled={testMutation.isPending}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Send Test Message
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                >
                  <X className="h-4 w-4 mr-2" />
                  Disable Integration
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>How to Setup</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h3 className="font-semibold">1. Create a Telegram Bot</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
              <li>Open Telegram and search for @BotFather</li>
              <li>Send /newbot command</li>
              <li>Follow instructions to create your bot</li>
              <li>Copy the bot token provided by BotFather</li>
            </ol>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold">2. Get Your Chat ID</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
              <li>Start a conversation with your bot</li>
              <li>Send any message to the bot</li>
              <li>Search for @userinfobot on Telegram</li>
              <li>Forward the message from your bot to @userinfobot</li>
              <li>Copy the chat ID provided</li>
            </ol>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold">3. Configure and Test</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
              <li>Paste bot token and chat ID above</li>
              <li>Click "Save Settings"</li>
              <li>Click "Send Test Message" to verify</li>
              <li>Check your Telegram for the test message</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
