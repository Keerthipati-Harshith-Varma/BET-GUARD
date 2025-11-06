import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Shield, ArrowLeft, Coins } from "lucide-react";

const CoinFlip = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [balance, setBalance] = useState(0);
  const [betAmount, setBetAmount] = useState("");
  const [prediction, setPrediction] = useState<"heads" | "tails" | null>(null);
  const [coinResult, setCoinResult] = useState<"heads" | "tails" | null>(null);
  const [isFlipping, setIsFlipping] = useState(false);

  useEffect(() => {
    loadBalance();
  }, []);

  const loadBalance = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/login");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("balance")
      .eq("id", user.id)
      .single();

    if (profile) setBalance(Number(profile.balance));
  };

  const flipCoin = async () => {
    if (!betAmount || !prediction) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please enter bet amount and choose heads or tails",
      });
      return;
    }

    const bet = parseFloat(betAmount);
    if (bet <= 0 || bet > balance) {
      toast({
        variant: "destructive",
        title: "Invalid Bet",
        description: "Bet must be positive and within your balance",
      });
      return;
    }

    setIsFlipping(true);
    
    // Animate coin flip
    let flips = 0;
    const flipInterval = setInterval(() => {
      setCoinResult(Math.random() > 0.5 ? "heads" : "tails");
      flips++;
      if (flips >= 8) {
        clearInterval(flipInterval);
        finalizeBet(bet);
      }
    }, 150);
  };

  const finalizeBet = async (bet: number) => {
    const result: "heads" | "tails" = Math.random() > 0.5 ? "heads" : "tails";
    setCoinResult(result);
    
    const won = result === prediction;
    const amount = won ? bet : -bet;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from("transactions").insert({
        user_id: user.id,
        amount: Math.abs(amount),
        trans_type: won ? "win" : "bet",
      });

      await supabase.from("audit_log").insert({
        user_id: user.id,
        action: `coin flip ${won ? 'won' : 'lost'} ₹${Math.abs(amount)}`,
      });

      toast({
        title: won ? "🎉 You Won!" : "😔 You Lost",
        description: `Coin landed on ${result}! You ${won ? 'won' : 'lost'} ₹${Math.abs(amount).toFixed(2)}`,
        variant: won ? "default" : "destructive",
      });

      setBalance(prev => prev + amount);
      setBetAmount("");
      setPrediction(null);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setIsFlipping(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link to="/dashboard" className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Bet<span className="text-primary">Guard</span></h1>
          </Link>
          <div className="flex gap-4 items-center">
            <div className="text-sm">
              Balance: <span className="text-primary font-bold">₹{balance.toFixed(2)}</span>
            </div>
            <Link to="/games">
              <Button variant="outline" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Games
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto">
          <CardHeader className="text-center">
            <CardTitle className="text-4xl mb-4">🪙 Coin Flip</CardTitle>
            <p className="text-muted-foreground">Heads or Tails? Double your money!</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex justify-center items-center h-48 bg-muted rounded-lg">
              {coinResult ? (
                <div className={`text-7xl ${isFlipping ? 'animate-spin' : 'animate-bounce'}`}>
                  {coinResult === "heads" ? "👑" : "🦅"}
                </div>
              ) : (
                <Coins className="w-24 h-24 text-muted-foreground" />
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Choose Your Side</label>
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    variant={prediction === "heads" ? "default" : "outline"}
                    onClick={() => setPrediction("heads")}
                    disabled={isFlipping}
                    className="h-20 text-lg"
                  >
                    👑 Heads
                  </Button>
                  <Button
                    variant={prediction === "tails" ? "default" : "outline"}
                    onClick={() => setPrediction("tails")}
                    disabled={isFlipping}
                    className="h-20 text-lg"
                  >
                    🦅 Tails
                  </Button>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Bet Amount (₹)</label>
                <Input
                  type="number"
                  value={betAmount}
                  onChange={(e) => setBetAmount(e.target.value)}
                  placeholder="Enter amount"
                  disabled={isFlipping}
                  min="1"
                  max={balance}
                />
              </div>

              <Button
                className="w-full"
                size="lg"
                onClick={flipCoin}
                disabled={isFlipping || !betAmount || !prediction}
              >
                {isFlipping ? "Flipping..." : "🪙 Flip Coin"}
              </Button>

              <div className="grid grid-cols-3 gap-2">
                {[50, 100, 500].map((amount) => (
                  <Button
                    key={amount}
                    variant="outline"
                    size="sm"
                    onClick={() => setBetAmount(String(Math.min(amount, balance)))}
                    disabled={isFlipping}
                  >
                    ₹{amount}
                  </Button>
                ))}
              </div>
            </div>

            <div className="text-center text-sm text-muted-foreground p-4 bg-muted rounded-lg">
              <p className="font-semibold mb-2">Game Rules:</p>
              <p>• Choose Heads or Tails</p>
              <p>• If you guess correctly, you double your bet</p>
              <p>• 50% chance to win</p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default CoinFlip;
