import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Shield, ArrowLeft } from "lucide-react";

const Roulette = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [balance, setBalance] = useState(0);
  const [betAmount, setBetAmount] = useState("");
  const [selectedBet, setSelectedBet] = useState<"red" | "black" | "green" | null>(null);
  const [result, setResult] = useState<number | null>(null);
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

  const getNumberColor = (num: number) => {
    if (num === 0) return "green";
    const redNumbers = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
    return redNumbers.includes(num) ? "red" : "black";
  };

  const spin = async () => {
    const bet = parseFloat(betAmount);

    if (!selectedBet) {
      toast({
        variant: "destructive",
        title: "Select a Bet",
        description: "Please select Red, Black, or Green",
      });
      return;
    }

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
      setResult(Math.floor(Math.random() * 37));
      count++;
      if (count >= 20) {
        clearInterval(spinInterval);
        finalizeSpin(bet);
      }
    }, 100);
  };

  const finalizeSpin = async (bet: number) => {
    const winningNumber = Math.floor(Math.random() * 37);
    setResult(winningNumber);
    
    const winningColor = getNumberColor(winningNumber);
    const won = winningColor === selectedBet;
    
    let multiplier = 0;
    if (selectedBet === "green" && won) multiplier = 35;
    else if (won) multiplier = 2;

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
        action: `roulette ${won ? 'won' : 'lost'} ₹${Math.abs(amount)} [${winningNumber} ${winningColor}]`,
      });

      toast({
        title: won ? "🎉 Winner!" : "😔 Try Again",
        description: `Number ${winningNumber} (${winningColor}) - You ${won ? 'won' : 'lost'} ₹${Math.abs(amount).toFixed(2)}`,
        variant: won ? "default" : "destructive",
      });

      setBalance(prev => prev + amount);
      setBetAmount("");
      setSelectedBet(null);
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
            <CardTitle className="text-4xl mb-4">🎡 Roulette</CardTitle>
            <p className="text-muted-foreground">Place your bet on Red, Black, or Green!</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex justify-center items-center h-48 bg-muted rounded-lg">
              {result !== null ? (
                <div className="text-center">
                  <div className={`text-8xl font-bold ${isSpinning ? 'animate-pulse' : ''}`}>
                    {result}
                  </div>
                  <div className={`text-2xl font-bold mt-2 ${
                    getNumberColor(result) === "red" ? "text-red-500" : 
                    getNumberColor(result) === "black" ? "text-gray-900" : 
                    "text-green-500"
                  }`}>
                    {getNumberColor(result).toUpperCase()}
                  </div>
                </div>
              ) : (
                <div className="text-6xl">🎡</div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2">
              <Button
                variant={selectedBet === "red" ? "default" : "outline"}
                onClick={() => setSelectedBet("red")}
                disabled={isSpinning}
                className="h-16 text-lg"
              >
                🔴 Red (2x)
              </Button>
              <Button
                variant={selectedBet === "black" ? "default" : "outline"}
                onClick={() => setSelectedBet("black")}
                disabled={isSpinning}
                className="h-16 text-lg"
              >
                ⚫ Black (2x)
              </Button>
              <Button
                variant={selectedBet === "green" ? "default" : "outline"}
                onClick={() => setSelectedBet("green")}
                disabled={isSpinning}
                className="h-16 text-lg"
              >
                🟢 Green (35x)
              </Button>
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
                disabled={isSpinning || !betAmount || !selectedBet}
              >
                {isSpinning ? "🎡 Spinning..." : "🎡 Spin Wheel"}
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
              <p>• Red/Black: 2x your bet (48.6% chance)</p>
              <p>• Green (0): 35x your bet (2.7% chance)</p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Roulette;
