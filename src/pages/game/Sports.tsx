import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Loader2, TrendingUp, Trophy, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";

interface Prediction {
  outcome: string;
  odds: number;
  probability: number;
  confidence: string;
}

interface MatchPredictions {
  match: string;
  sport: string;
  predictions: Prediction[];
  analysis: string;
  keyFactors: string[];
}

const Sports = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [balance, setBalance] = useState(0);
  const [betAmount, setBetAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [selectedSport, setSelectedSport] = useState("football");
  const [predictions, setPredictions] = useState<MatchPredictions | null>(null);
  const [selectedBet, setSelectedBet] = useState<Prediction | null>(null);

  const sports = [
    { id: "football", name: "Football", teams: { team1: "Manchester United", team2: "Liverpool" } },
    { id: "cricket", name: "Cricket", teams: { team1: "India", team2: "Australia" } },
    { id: "basketball", name: "Basketball", teams: { team1: "Lakers", team2: "Warriors" } },
    { id: "tennis", name: "Tennis", teams: { team1: "Djokovic", team2: "Nadal" } },
  ];

  useEffect(() => {
    loadBalance();
  }, []);

  const loadBalance = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/login");
      return;
    }

    const { data } = await supabase
      .from("profiles")
      .select("balance")
      .eq("id", user.id)
      .single();

    if (data) setBalance(data.balance);
  };

  const generatePredictions = async () => {
    setGenerating(true);
    try {
      const sport = sports.find(s => s.id === selectedSport);
      if (!sport) return;

      const { data, error } = await supabase.functions.invoke('sports-predictions', {
        body: { 
          sport: sport.name,
          teams: sport.teams
        }
      });

      if (error) throw error;

      if (data.success) {
        setPredictions(data.predictions);
        toast({
          title: "Predictions Generated",
          description: "AI has analyzed the match and generated predictions",
        });
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setGenerating(false);
    }
  };

  const placeBet = async () => {
    if (!selectedBet || !betAmount || !predictions) return;

    const amount = parseFloat(betAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        variant: "destructive",
        title: "Invalid Amount",
        description: "Please enter a valid bet amount",
      });
      return;
    }

    if (amount > balance) {
      toast({
        variant: "destructive",
        title: "Insufficient Balance",
        description: "You don't have enough balance for this bet",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Record bet transaction
      const { error: betError } = await supabase.from("transactions").insert({
        user_id: user.id,
        amount,
        trans_type: "bet",
      });

      if (betError) throw betError;

      // Simulate match result (30% chance based on probability)
      const randomValue = Math.random() * 100;
      const isWin = randomValue < selectedBet.probability * 0.3; // Reduced from actual probability

      if (isWin) {
        const winAmount = amount * selectedBet.odds;
        
        const { error: winError } = await supabase.from("transactions").insert({
          user_id: user.id,
          amount: winAmount,
          trans_type: "win",
        });

        if (winError) throw winError;

        // Log audit
        await supabase.from("audit_log").insert({
          user_id: user.id,
          action: `sports_bet_win: ${selectedBet.outcome}`,
        });

        toast({
          title: "🎉 You Won!",
          description: `${selectedBet.outcome} happened! You won ₹${winAmount.toFixed(2)}`,
        });
      } else {
        await supabase.from("audit_log").insert({
          user_id: user.id,
          action: `sports_bet_loss: ${selectedBet.outcome}`,
        });

        toast({
          variant: "destructive",
          title: "Match Result",
          description: `${selectedBet.outcome} didn't happen. Better luck next time!`,
        });
      }

      await loadBalance();
      setBetAmount("");
      setSelectedBet(null);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence.toLowerCase()) {
      case 'high': return 'bg-green-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="container mx-auto max-w-6xl">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate("/games")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Games
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Sport Selection */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-primary" />
                Sports Betting
              </CardTitle>
              <CardDescription>AI-Powered Match Predictions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Your Balance</p>
                <p className="text-2xl font-bold">₹{balance.toFixed(2)}</p>
              </div>

              <div className="space-y-2">
                <Label>Select Sport</Label>
                <Tabs value={selectedSport} onValueChange={setSelectedSport}>
                  <TabsList className="grid grid-cols-2 gap-2">
                    {sports.map(sport => (
                      <TabsTrigger key={sport.id} value={sport.id}>
                        {sport.name}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
              </div>

              <Button 
                onClick={generatePredictions} 
                disabled={generating}
                className="w-full"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 mr-2" />
                    Generate AI Predictions
                  </>
                )}
              </Button>

              {predictions && (
                <div className="pt-4 border-t">
                  <h3 className="font-semibold mb-2">Match</h3>
                  <p className="text-sm text-muted-foreground">{predictions.match}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Right Panel - Predictions & Betting */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Match Analysis & Betting</CardTitle>
              <CardDescription>
                {predictions ? "Place your bet on the predicted outcome" : "Generate predictions to start betting"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!predictions ? (
                <div className="text-center py-12">
                  <Trophy className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                  <p className="text-lg font-semibold mb-2">No Predictions Yet</p>
                  <p className="text-muted-foreground">
                    Select a sport and generate AI predictions to start betting
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* AI Analysis */}
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <div className="flex items-start gap-2 mb-3">
                      <TrendingUp className="w-5 h-5 text-primary mt-0.5" />
                      <div>
                        <h3 className="font-semibold mb-1">AI Analysis</h3>
                        <p className="text-sm text-muted-foreground">{predictions.analysis}</p>
                      </div>
                    </div>
                    <div className="mt-3">
                      <p className="text-sm font-semibold mb-2">Key Factors:</p>
                      <div className="flex flex-wrap gap-2">
                        {predictions.keyFactors.map((factor, idx) => (
                          <Badge key={idx} variant="outline">{factor}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Betting Options */}
                  <div className="space-y-3">
                    <h3 className="font-semibold">Betting Options</h3>
                    {predictions.predictions.map((pred, idx) => (
                      <div
                        key={idx}
                        className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
                          selectedBet?.outcome === pred.outcome
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        }`}
                        onClick={() => setSelectedBet(pred)}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <p className="font-semibold">{pred.outcome}</p>
                            <p className="text-2xl font-bold text-primary">×{pred.odds}</p>
                          </div>
                          <Badge className={getConfidenceColor(pred.confidence)}>
                            {pred.confidence} confidence
                          </Badge>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Win Probability</span>
                            <span className="font-semibold">{pred.probability}%</span>
                          </div>
                          <Progress value={pred.probability} className="h-2" />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Bet Input */}
                  {selectedBet && (
                    <div className="space-y-4 p-4 border rounded-lg bg-card">
                      <div>
                        <Label>Bet Amount (₹)</Label>
                        <Input
                          type="number"
                          value={betAmount}
                          onChange={(e) => setBetAmount(e.target.value)}
                          placeholder="Enter amount"
                          disabled={loading}
                        />
                      </div>

                      {betAmount && parseFloat(betAmount) > 0 && (
                        <div className="bg-muted/50 p-3 rounded space-y-1">
                          <div className="flex justify-between text-sm">
                            <span>Bet Amount:</span>
                            <span className="font-semibold">₹{parseFloat(betAmount).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Potential Win:</span>
                            <span className="font-semibold text-green-500">
                              ₹{(parseFloat(betAmount) * selectedBet.odds).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      )}

                      <Button 
                        onClick={placeBet} 
                        disabled={loading || !betAmount}
                        className="w-full"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Placing Bet...
                          </>
                        ) : (
                          `Place Bet on ${selectedBet.outcome}`
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Sports;
