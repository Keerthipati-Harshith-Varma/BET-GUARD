import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Shield, ArrowLeft, Dice1, Dice2, Dice3, Dice4, Dice5, Dice6 } from "lucide-react";

const DiceGame = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [balance, setBalance] = useState(0);
  const [betAmount, setBetAmount] = useState("");
  const [prediction, setPrediction] = useState<number | null>(null);
  const [diceResult, setDiceResult] = useState<number | null>(null);
  const [isRolling, setIsRolling] = useState(false);

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

  const rollDice = async () => {
    if (!betAmount || !prediction) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please enter bet amount and choose a number",
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

    setIsRolling(true);
    
    // Animate dice roll
    let rolls = 0;
    const rollInterval = setInterval(() => {
      setDiceResult(Math.floor(Math.random() * 6) + 1);
      rolls++;
      if (rolls >= 10) {
        clearInterval(rollInterval);
        finalizeBet(bet);
      }
    }, 100);
  };

  const finalizeBet = async (bet: number) => {
    const result = Math.floor(Math.random() * 6) + 1;
    setDiceResult(result);
    
    const won = result === prediction;
    const amount = won ? bet * 5 : -bet;

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
        action: `dice game ${won ? 'won' : 'lost'} ₹${Math.abs(amount)}`,
      });

      toast({
        title: won ? "🎉 You Won!" : "😔 You Lost",
        description: `You ${won ? 'won' : 'lost'} ₹${Math.abs(amount).toFixed(2)}`,
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
      setIsRolling(false);
    }
  };

  const getDiceIcon = (num: number) => {
    const icons = [Dice1, Dice2, Dice3, Dice4, Dice5, Dice6];
    const Icon = icons[num - 1];
    return <Icon className="w-20 h-20" />;
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
            <CardTitle className="text-4xl mb-4">🎲 Dice Game</CardTitle>
            <p className="text-muted-foreground">Predict the dice number and win 5x your bet!</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex justify-center items-center h-32 bg-muted rounded-lg">
              {diceResult ? (
                <div className="text-primary animate-bounce">
                  {getDiceIcon(diceResult)}
                </div>
              ) : (
                <p className="text-muted-foreground">Roll the dice to start</p>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Choose Your Number</label>
                <div className="grid grid-cols-6 gap-2">
                  {[1, 2, 3, 4, 5, 6].map((num) => (
                    <Button
                      key={num}
                      variant={prediction === num ? "default" : "outline"}
                      onClick={() => setPrediction(num)}
                      disabled={isRolling}
                      className="h-16"
                    >
                      {num}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Bet Amount (₹)</label>
                <Input
                  type="number"
                  value={betAmount}
                  onChange={(e) => setBetAmount(e.target.value)}
                  placeholder="Enter amount"
                  disabled={isRolling}
                  min="1"
                  max={balance}
                />
              </div>

              <Button
                className="w-full"
                size="lg"
                onClick={rollDice}
                disabled={isRolling || !betAmount || !prediction}
              >
                {isRolling ? "Rolling..." : "🎲 Roll Dice"}
              </Button>

              <div className="grid grid-cols-3 gap-2">
                {[50, 100, 500].map((amount) => (
                  <Button
                    key={amount}
                    variant="outline"
                    size="sm"
                    onClick={() => setBetAmount(String(Math.min(amount, balance)))}
                    disabled={isRolling}
                  >
                    ₹{amount}
                  </Button>
                ))}
              </div>
            </div>

            <div className="text-center text-sm text-muted-foreground p-4 bg-muted rounded-lg">
              <p className="font-semibold mb-2">Game Rules:</p>
              <p>• Choose a number from 1 to 6</p>
              <p>• If your number matches the dice, you win 5x your bet</p>
              <p>• Minimum bet: ₹5</p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default DiceGame;
