import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Shield, ArrowLeft } from "lucide-react";

type CardType = { value: number; display: string };

const Blackjack = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [balance, setBalance] = useState(0);
  const [betAmount, setBetAmount] = useState("");
  const [playerHand, setPlayerHand] = useState<CardType[]>([]);
  const [dealerHand, setDealerHand] = useState<CardType[]>([]);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);

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

  const getRandomCard = (): CardType => {
    const cards = [
      { value: 1, display: "A" }, { value: 2, display: "2" }, { value: 3, display: "3" },
      { value: 4, display: "4" }, { value: 5, display: "5" }, { value: 6, display: "6" },
      { value: 7, display: "7" }, { value: 8, display: "8" }, { value: 9, display: "9" },
      { value: 10, display: "10" }, { value: 10, display: "J" },
      { value: 10, display: "Q" }, { value: 10, display: "K" },
    ];
    return cards[Math.floor(Math.random() * cards.length)];
  };

  const calculateScore = (hand: CardType[]): number => {
    let score = hand.reduce((sum, card) => sum + card.value, 0);
    let aces = hand.filter(card => card.value === 1).length;
    
    while (score <= 11 && aces > 0) {
      score += 10;
      aces--;
    }
    
    return score;
  };

  const startGame = () => {
    const bet = parseFloat(betAmount);
    if (!betAmount || bet <= 0 || bet > balance) {
      toast({
        variant: "destructive",
        title: "Invalid Bet",
        description: "Please enter a valid bet amount",
      });
      return;
    }

    const newPlayerHand = [getRandomCard(), getRandomCard()];
    const newDealerHand = [getRandomCard(), getRandomCard()];
    
    setPlayerHand(newPlayerHand);
    setDealerHand(newDealerHand);
    setGameStarted(true);
    setGameOver(false);
  };

  const hit = () => {
    const newHand = [...playerHand, getRandomCard()];
    setPlayerHand(newHand);
    
    if (calculateScore(newHand) > 21) {
      endGame(false);
    }
  };

  const stand = async () => {
    let newDealerHand = [...dealerHand];
    
    while (calculateScore(newDealerHand) < 17) {
      newDealerHand.push(getRandomCard());
    }
    
    setDealerHand(newDealerHand);
    
    const playerScore = calculateScore(playerHand);
    const dealerScore = calculateScore(newDealerHand);
    
    const won = playerScore <= 21 && (dealerScore > 21 || playerScore > dealerScore);
    endGame(won);
  };

  const endGame = async (won: boolean) => {
    setGameOver(true);
    const bet = parseFloat(betAmount);
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
        action: `blackjack ${won ? 'won' : 'lost'} ₹${Math.abs(amount)}`,
      });

      toast({
        title: won ? "🎉 You Win!" : "😔 Dealer Wins",
        description: `You ${won ? 'won' : 'lost'} ₹${Math.abs(amount).toFixed(2)}`,
        variant: won ? "default" : "destructive",
      });

      setBalance(prev => prev + amount);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
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
            <CardTitle className="text-4xl mb-4">🃏 Blackjack</CardTitle>
            <p className="text-muted-foreground">Get as close to 21 as possible without going over!</p>
          </CardHeader>
          <CardContent className="space-y-6">
            {gameStarted ? (
              <>
                <div className="space-y-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <h3 className="font-bold mb-2">Dealer's Hand ({gameOver ? calculateScore(dealerHand) : '?'})</h3>
                    <div className="flex gap-2 flex-wrap">
                      {dealerHand.map((card, idx) => (
                        <div key={idx} className="w-16 h-24 bg-card border-2 border-primary rounded flex items-center justify-center text-2xl font-bold">
                          {gameOver || idx === 0 ? card.display : "?"}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 bg-muted rounded-lg">
                    <h3 className="font-bold mb-2">Your Hand ({calculateScore(playerHand)})</h3>
                    <div className="flex gap-2 flex-wrap">
                      {playerHand.map((card, idx) => (
                        <div key={idx} className="w-16 h-24 bg-card border-2 border-primary rounded flex items-center justify-center text-2xl font-bold">
                          {card.display}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {!gameOver && (
                  <div className="flex gap-2">
                    <Button className="flex-1" size="lg" onClick={hit}>
                      Hit
                    </Button>
                    <Button className="flex-1" size="lg" variant="outline" onClick={stand}>
                      Stand
                    </Button>
                  </div>
                )}

                {gameOver && (
                  <Button
                    className="w-full"
                    size="lg"
                    onClick={() => {
                      setGameStarted(false);
                      setBetAmount("");
                    }}
                  >
                    New Game
                  </Button>
                )}
              </>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Bet Amount (₹)</label>
                  <Input
                    type="number"
                    value={betAmount}
                    onChange={(e) => setBetAmount(e.target.value)}
                    placeholder="Enter amount"
                    min="1"
                    max={balance}
                  />
                </div>

                <Button className="w-full" size="lg" onClick={startGame} disabled={!betAmount}>
                  🃏 Deal Cards
                </Button>

                <div className="grid grid-cols-3 gap-2">
                  {[50, 100, 500].map((amount) => (
                    <Button
                      key={amount}
                      variant="outline"
                      size="sm"
                      onClick={() => setBetAmount(String(Math.min(amount, balance)))}
                    >
                      ₹{amount}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <div className="text-center text-sm text-muted-foreground p-4 bg-muted rounded-lg">
              <p className="font-semibold mb-2">Rules:</p>
              <p>• Get closer to 21 than the dealer without going over</p>
              <p>• Dealer must hit on 16 or less, stand on 17+</p>
              <p>• Win pays 1:1</p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Blackjack;
