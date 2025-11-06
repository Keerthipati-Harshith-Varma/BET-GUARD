import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Shield, ArrowLeft, Hash } from "lucide-react";

const NumberGuess = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [balance, setBalance] = useState(0);
  const [betAmount, setBetAmount] = useState("");
  const [guess, setGuess] = useState("");
  const [result, setResult] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

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

  const playGame = async () => {
    const guessNum = parseInt(guess);
    const bet = parseFloat(betAmount);

    if (!guess || isNaN(guessNum) || guessNum < 1 || guessNum > 10) {
      toast({
        variant: "destructive",
        title: "Invalid Guess",
        description: "Please enter a number between 1 and 10",
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

    setIsPlaying(true);
    
    // Animate counting
    let count = 0;
    const countInterval = setInterval(() => {
      setResult(Math.floor(Math.random() * 10) + 1);
      count++;
      if (count >= 10) {
        clearInterval(countInterval);
        finalizeBet(bet, guessNum);
      }
    }, 100);
  };

  const finalizeBet = async (bet: number, guessNum: number) => {
    const winningNumber = Math.floor(Math.random() * 10) + 1;
    setResult(winningNumber);
    
    const won = winningNumber === guessNum;
    const amount = won ? bet * 9 : -bet;

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
        action: `number guess ${won ? 'won' : 'lost'} ₹${Math.abs(amount)}`,
      });

      toast({
        title: won ? "🎉 Jackpot!" : "😔 Try Again",
        description: `Number was ${winningNumber}. You ${won ? 'won' : 'lost'} ₹${Math.abs(amount).toFixed(2)}`,
        variant: won ? "default" : "destructive",
      });

      setBalance(prev => prev + amount);
      setBetAmount("");
      setGuess("");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setIsPlaying(false);
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
            <CardTitle className="text-4xl mb-4">🔢 Number Guess</CardTitle>
            <p className="text-muted-foreground">Guess the number from 1-10 and win 10x!</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex justify-center items-center h-48 bg-muted rounded-lg">
              {result !== null ? (
                <div className="text-8xl font-bold text-primary animate-pulse">
                  {result}
                </div>
              ) : (
                <Hash className="w-32 h-32 text-muted-foreground" />
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Your Guess (1-10)</label>
                <Input
                  type="number"
                  value={guess}
                  onChange={(e) => setGuess(e.target.value)}
                  placeholder="Enter number"
                  disabled={isPlaying}
                  min="1"
                  max="10"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Bet Amount (₹)</label>
                <Input
                  type="number"
                  value={betAmount}
                  onChange={(e) => setBetAmount(e.target.value)}
                  placeholder="Enter amount"
                  disabled={isPlaying}
                  min="1"
                  max={balance}
                />
              </div>

              <Button
                className="w-full"
                size="lg"
                onClick={playGame}
                disabled={isPlaying || !betAmount || !guess}
              >
                {isPlaying ? "Revealing..." : "🎯 Guess Number"}
              </Button>

              <div className="grid grid-cols-3 gap-2">
                {[50, 100, 500].map((amount) => (
                  <Button
                    key={amount}
                    variant="outline"
                    size="sm"
                    onClick={() => setBetAmount(String(Math.min(amount, balance)))}
                    disabled={isPlaying}
                  >
                    ₹{amount}
                  </Button>
                ))}
              </div>
            </div>

            <div className="text-center text-sm text-muted-foreground p-4 bg-muted rounded-lg">
              <p className="font-semibold mb-2">Game Rules:</p>
              <p>• Guess a number from 1 to 10</p>
              <p>• If you guess correctly, you win 10x your bet</p>
              <p>• 10% chance to win - High risk, high reward!</p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default NumberGuess;
