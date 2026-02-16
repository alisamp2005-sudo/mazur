import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Send, CheckCircle, XCircle, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function TelegramSettings() {
  const [botToken, setBotToken] = useState("");
  const [chatId, setChatId] = useState("");

  const { data: config, refetch } = trpc.settings.getTelegramConfig.useQuery();
  const saveMutation = trpc.settings.setTelegramConfig.useMutation();
  const testMutation = trpc.settings.testTelegramBot.useMutation();

  // Load config into form
  useState(() => {
    if (config) {
      setBotToken(config.botToken);
      setChatId(config.chatId);
    }
  });

  const handleSave = async () => {
    if (!botToken || !chatId) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      await saveMutation.mutateAsync({ botToken, chatId });
      toast.success("Telegram configuration saved");
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Failed to save configuration");
    }
  };

  const handleTest = async () => {
    try {
      await testMutation.mutateAsync();
      toast.success("Test message sent successfully! Check your Telegram");
    } catch (error: any) {
      toast.error(error.message || "Failed to send test message");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Telegram Integration</h1>
        <p className="text-muted-foreground mt-2">
          Configure Telegram bot to receive call recordings and transcripts
        </p>
      </div>

      {/* Configuration Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Configuration Status</CardTitle>
              <CardDescription>Current Telegram bot connection status</CardDescription>
            </div>
            <Badge variant={config?.isConfigured ? "default" : "secondary"}>
              {config?.isConfigured ? (
                <>
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Configured
                </>
              ) : (
                <>
                  <XCircle className="h-3 w-3 mr-1" />
                  Not Configured
                </>
              )}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Bot Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>
            <MessageSquare className="h-5 w-5 inline mr-2" />
            Bot Configuration
          </CardTitle>
          <CardDescription>
            Set up your Telegram bot token and chat ID
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bot-token">Bot Token</Label>
            <Input
              id="bot-token"
              type="password"
              placeholder="1234567890:ABCdefGHIjklMNOpqrsTUVwxyz"
              value={botToken}
              onChange={(e) => setBotToken(e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              Get your bot token from @BotFather on Telegram
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="chat-id">Chat ID</Label>
            <Input
              id="chat-id"
              placeholder="-1001234567890"
              value={chatId}
              onChange={(e) => setChatId(e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              Your Telegram chat ID or group ID (use @userinfobot to get it)
            </p>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              onClick={handleSave}
              disabled={saveMutation.isPending || !botToken || !chatId}
            >
              {saveMutation.isPending ? "Saving..." : "Save Configuration"}
            </Button>

            {config?.isConfigured && (
              <Button
                variant="outline"
                onClick={handleTest}
                disabled={testMutation.isPending}
              >
                <Send className="h-4 w-4 mr-2" />
                {testMutation.isPending ? "Sending..." : "Send Test Message"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* How it Works */}
      <Card>
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
              1
            </div>
            <div>
              <p className="font-medium">Create a Telegram Bot</p>
              <p className="text-sm text-muted-foreground">
                Message @BotFather on Telegram and use /newbot command to create your bot
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
              2
            </div>
            <div>
              <p className="font-medium">Get Your Chat ID</p>
              <p className="text-sm text-muted-foreground">
                Message @userinfobot on Telegram to get your chat ID, or add the bot to a group
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
              3
            </div>
            <div>
              <p className="font-medium">Configure Above</p>
              <p className="text-sm text-muted-foreground">
                Enter your bot token and chat ID, then click Save Configuration
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
              4
            </div>
            <div>
              <p className="font-medium">Receive Notifications</p>
              <p className="text-sm text-muted-foreground">
                After each call, you'll receive the recording and transcript in Telegram
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
