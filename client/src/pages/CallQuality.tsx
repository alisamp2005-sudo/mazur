import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Star, Sparkles, TrendingUp, CheckCircle2, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

export default function CallQuality() {
  const { toast } = useToast();
  const [location] = useLocation();
  const urlParams = new URLSearchParams(location.split('?')[1] || '');
  const callId = urlParams.get("callId") ? parseInt(urlParams.get("callId")!) : null;

  const [overallRating, setOverallRating] = useState(0);
  const [clarityScore, setClarityScore] = useState(0);
  const [engagementScore, setEngagementScore] = useState(0);
  const [objectiveAchieved, setObjectiveAchieved] = useState<boolean | null>(null);
  const [transferSuccessful, setTransferSuccessful] = useState<boolean | null>(null);
  const [feedback, setFeedback] = useState("");

  const { data: existingRating, isLoading: loadingRating } = trpc.ratings.get.useQuery(
    { callId: callId! },
    { enabled: !!callId }
  );

  const { data: calls } = trpc.calls.list.useQuery(
    { limit: 1000 },
    { enabled: !!callId }
  );
  const call = calls?.find(c => c.id === callId);

  const createRating = trpc.ratings.create.useMutation({
    onSuccess: () => {
      toast({
        title: "Rating saved",
        description: "Call quality rating has been saved successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const autoEvaluate = trpc.ratings.autoEvaluate.useMutation({
    onSuccess: (data) => {
      setOverallRating(data.overallRating || 0);
      setClarityScore(data.clarityScore || 0);
      setEngagementScore(data.engagementScore || 0);
      setObjectiveAchieved(data.objectiveAchieved || false);
      setFeedback(data.feedback || "");
      
      toast({
        title: "Auto-evaluation complete",
        description: "AI has analyzed the call and provided ratings.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!callId) return;
    if (overallRating === 0) {
      toast({
        title: "Rating required",
        description: "Please provide an overall rating.",
        variant: "destructive",
      });
      return;
    }

    createRating.mutate({
      callId,
      overallRating,
      clarityScore: clarityScore || undefined,
      engagementScore: engagementScore || undefined,
      objectiveAchieved: objectiveAchieved ?? undefined,
      transferSuccessful: transferSuccessful ?? undefined,
      feedback: feedback || undefined,
    });
  };

  const handleAutoEvaluate = () => {
    if (!callId) return;
    autoEvaluate.mutate({ callId });
  };

  const StarRating = ({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className="focus:outline-none transition-transform hover:scale-110"
          >
            <Star
              className={`h-8 w-8 ${
                star <= value
                  ? "fill-yellow-400 text-yellow-400"
                  : "text-gray-300"
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );

  if (!callId) {
    return (
      <div className="container py-8">
        <Card>
          <CardHeader>
            <CardTitle>Call Quality Evaluation</CardTitle>
            <CardDescription>No call selected</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Please select a call from the Call Logs page to evaluate its quality.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loadingRating) {
    return (
      <div className="container py-8">
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">Loading...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (existingRating) {
    return (
      <div className="container py-8">
        <Card>
          <CardHeader>
            <CardTitle>Call Quality Rating</CardTitle>
            <CardDescription>
              Call to {call?.toNumber} - Already rated
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="flex items-center gap-3">
                <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                <div>
                  <p className="text-sm text-muted-foreground">Overall Rating</p>
                  <p className="text-2xl font-bold">{existingRating.overallRating}/5</p>
                </div>
              </div>
              {existingRating.clarityScore && (
                <div className="flex items-center gap-3">
                  <TrendingUp className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Clarity</p>
                    <p className="text-2xl font-bold">{existingRating.clarityScore}/5</p>
                  </div>
                </div>
              )}
              {existingRating.engagementScore && (
                <div className="flex items-center gap-3">
                  <Sparkles className="h-5 w-5 text-purple-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Engagement</p>
                    <p className="text-2xl font-bold">{existingRating.engagementScore}/5</p>
                  </div>
                </div>
              )}
            </div>

            {existingRating.objectiveAchieved !== null && (
              <div className="flex items-center gap-2">
                {existingRating.objectiveAchieved ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
                <span className="text-sm">
                  Objective {existingRating.objectiveAchieved ? "Achieved" : "Not Achieved"}
                </span>
              </div>
            )}

            {existingRating.feedback && (
              <div className="space-y-2">
                <Label>Feedback</Label>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {existingRating.feedback}
                </p>
              </div>
            )}

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Evaluated by:</span>
              <span className="font-medium">
                {existingRating.evaluationType === "auto" ? "AI System" : existingRating.evaluatedBy}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <Card>
        <CardHeader>
          <CardTitle>Evaluate Call Quality</CardTitle>
          <CardDescription>
            Call to {call?.toNumber} - Rate the quality of this call
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={handleAutoEvaluate}
              disabled={autoEvaluate.isPending}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              {autoEvaluate.isPending ? "Evaluating..." : "Auto-Evaluate with AI"}
            </Button>
          </div>

          <StarRating
            value={overallRating}
            onChange={setOverallRating}
            label="Overall Rating *"
          />

          <StarRating
            value={clarityScore}
            onChange={setClarityScore}
            label="Clarity Score"
          />

          <StarRating
            value={engagementScore}
            onChange={setEngagementScore}
            label="Engagement Score"
          />

          <div className="space-y-2">
            <Label>Objective Achieved?</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={objectiveAchieved === true ? "default" : "outline"}
                onClick={() => setObjectiveAchieved(true)}
                className="flex-1"
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Yes
              </Button>
              <Button
                type="button"
                variant={objectiveAchieved === false ? "default" : "outline"}
                onClick={() => setObjectiveAchieved(false)}
                className="flex-1"
              >
                <XCircle className="mr-2 h-4 w-4" />
                No
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Transfer Successful? (if applicable)</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={transferSuccessful === true ? "default" : "outline"}
                onClick={() => setTransferSuccessful(true)}
                className="flex-1"
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Yes
              </Button>
              <Button
                type="button"
                variant={transferSuccessful === false ? "default" : "outline"}
                onClick={() => setTransferSuccessful(false)}
                className="flex-1"
              >
                <XCircle className="mr-2 h-4 w-4" />
                No
              </Button>
              <Button
                type="button"
                variant={transferSuccessful === null ? "default" : "outline"}
                onClick={() => setTransferSuccessful(null)}
                className="flex-1"
              >
                N/A
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="feedback">Feedback & Notes</Label>
            <Textarea
              id="feedback"
              placeholder="Add any additional feedback or notes about this call..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={4}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              onClick={handleSubmit}
              disabled={createRating.isPending || overallRating === 0}
            >
              {createRating.isPending ? "Saving..." : "Save Rating"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
