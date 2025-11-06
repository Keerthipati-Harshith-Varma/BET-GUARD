import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Shield, ArrowLeft } from "lucide-react";

const symbols = ["🍒", "🍇", "🍋", "💎", "7️⃣", "⭐"];

const Slots = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [balance, setBalance] = useState(0);
  const [betAmount, setBetAmount] = useState("");
  const [reels, setReels] = useState(["🍒", "🍒", "🍒"]);
  const [isSpinning, setIsSpinning] = useState(false);

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

  const spin = async () => {
    const bet = parseFloat(betAmount);

    if (!betAmount || bet <= 0 || bet > balance) {
      toast({
        variant: "destructive",
        title: "Invalid Bet",
        description: "Please enter a valid bet amount",
      });
      return;
    }

    setIsSpinning(true);
    
    // Animate spinning
    let count = 0;
    const spinInterval = setInterval(() => {
      setReels([
        symbols[Math.floor(Math.random() * symbols.length)],
        symbols[Math.floor(Math.random() * symbols.length)],
        symbols[Math.floor(Math.random() * symbols.length)],
      ]);
      count++;
      if (count >= 15) {
        clearInterval(spinInterval);
        finalizeSpin(bet);
      }
    }, 100);
  };

  const finalizeSpin = async (bet: number) => {
    const finalReels = [
      symbols[Math.floor(Math.random() * symbols.length)],
      symbols[Math.floor(Math.random() * symbols.length)],
      symbols[Math.floor(Math.random() * symbols.length)],
    ];
    setReels(finalReels);

    const allMatch = finalReels[0] === finalReels[1] && finalReels[1] === finalReels[2];
    const twoMatch = finalReels[0] === finalReels[1] || finalReels[1] === finalReels[2] || finalReels[0] === finalReels[2];
    
    let multiplier = 0;
    if (allMatch) multiplier = 10;
    else if (twoMatch) multiplier = 2;

    const won = multiplier > 0;
    const amount = won ? bet * multiplier : -bet;

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
        action: `slots ${won ? 'won' : 'lost'} ₹${Math.abs(amount)} [${finalReels.join(' ')}]`,
      });

      toast({
        title: won ? "🎰 Jackpot!" : "😔 Try Again",
        description: `${finalReels.join(' ')} - You ${won ? 'won' : 'lost'} ₹${Math.abs(amount).toFixed(2)}`,
        variant: won ? "default" : "destructive",
      });

      setBalance(prev => prev + amount);
      setBetAmount("");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setIsSpinning(false);
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
            <CardTitle className="text-4xl mb-4">🎰 Slot Machine</CardTitle>
            <p className="text-muted-foreground">Match symbols to win big!</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex justify-center items-center gap-4 h-48 bg-muted rounded-lg">
              {reels.map((symbol, idx) => (
                <div
                  key={idx}
                  className={`text-8xl font-bold ${isSpinning ? 'animate-pulse' : ''}`}
                >
                  {symbol}
                </div>
              ))}
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Bet Amount (₹)</label>
                <Input
                  type="number"
                  value={betAmount}
                  onChange={(e) => setBetAmount(e.target.value)}
                  placeholder="Enter amount"
                  disabled={isSpinning}
                  min="1"
                  max={balance}
                />
              </div>

              <Button
                className="w-full"
                size="lg"
                onClick={spin}
                disabled={isSpinning || !betAmount}
              >
                {isSpinning ? "🎰 Spinning..." : "🎰 Spin"}
              </Button>

              <div className="grid grid-cols-3 gap-2">
                {[50, 100, 500].map((amount) => (
                  <Button
                    key={amount}
                    variant="outline"
                    size="sm"
                    onClick={() => setBetAmount(String(Math.min(amount, balance)))}
                    disabled={isSpinning}
                  >
                    ₹{amount}
                  </Button>
                ))}
              </div>
            </div>

            <div className="text-center text-sm text-muted-foreground p-4 bg-muted rounded-lg">
              <p className="font-semibold mb-2">Payouts:</p>
              <p>• 3 matching symbols = 10x bet</p>
              <p>• 2 matching symbols = 2x bet</p>
              <p>• No match = lose bet</p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Slots;
