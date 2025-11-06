import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Play, ArrowLeft } from "lucide-react";
import pokerImg from "@/assets/game-poker.jpg";
import slotsImg from "@/assets/game-slots.jpg";
import rouletteImg from "@/assets/game-roulette.jpg";
import blackjackImg from "@/assets/game-blackjack.jpg";
import sportsImg from "@/assets/game-sports.jpg";
import diceImg from "@/assets/game-dice.jpg";

const games = [
  {
    id: 1,
    name: "🎲 Dice Game",
    image: diceImg,
    description: "Guess the dice number - Win 5x your bet!",
    minBet: 5,
    route: "/game/dice",
    playable: true,
  },
  {
    id: 2,
    name: "🪙 Coin Flip",
    image: slotsImg,
    description: "Heads or Tails - Double or nothing!",
    minBet: 10,
    route: "/game/coin-flip",
    playable: true,
  },
  {
    id: 3,
    name: "🔢 Number Guess",
    image: rouletteImg,
    description: "Guess 1-10 correctly - Win 10x!",
    minBet: 5,
    route: "/game/number-guess",
    playable: true,
  },
  {
    id: 4,
    name: "🎰 Slots",
    image: slotsImg,
    description: "Match 3 symbols - Win up to 10x!",
    minBet: 10,
    route: "/game/slots",
    playable: true,
  },
  {
    id: 5,
    name: "🎡 Roulette",
    image: rouletteImg,
    description: "Red, Black or Green - Spin to win!",
    minBet: 20,
    route: "/game/roulette",
    playable: true,
  },
  {
    id: 6,
    name: "🃏 Blackjack",
    image: blackjackImg,
    description: "Beat the dealer and hit 21!",
    minBet: 25,
    route: "/game/blackjack",
    playable: true,
  },
  {
    id: 7,
    name: "🃏 Poker",
    image: pokerImg,
    description: "Test your skills in Texas Hold'em",
    minBet: 50,
    playable: false,
  },
  {
    id: 8,
    name: "⚽ Sports Betting",
    image: sportsImg,
    description: "Bet on your favorite sports events",
    minBet: 50,
    route: "/game/sports",
    playable: true,
  },
  {
    id: 9,
    name: "🎲 Craps",
    image: diceImg,
    description: "Classic casino dice game",
    minBet: 15,
    playable: false,
  },
];

const Games = () => {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link to="/" className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Bet<span className="text-primary">Guard</span></h1>
          </Link>
          <Link to="/dashboard">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Dashboard
            </Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-4xl font-bold mb-2">
            Game <span className="text-primary">Library</span>
          </h2>
          <p className="text-muted-foreground">Choose from our collection of exciting games</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {games.map((game) => (
            <Card key={game.id} className="border-border overflow-hidden group hover:border-primary transition-all hover:shadow-[var(--shadow-glow)]">
              <div className="relative aspect-square overflow-hidden">
                <img 
                  src={game.image} 
                  alt={game.name}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent opacity-60" />
              </div>
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  {game.name}
                  <span className="text-sm font-normal text-muted-foreground">
                    Min: ₹{game.minBet}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">{game.description}</p>
                {game.playable ? (
                  <Link to={game.route!}>
                    <Button className="w-full group-hover:animate-glow-pulse">
                      <Play className="mr-2 h-4 w-4" />
                      Play Now
                    </Button>
                  </Link>
                ) : (
                  <Button className="w-full" variant="outline" disabled>
                    Coming Soon
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-12 p-6 bg-card border border-border rounded-lg text-center">
          <h3 className="text-2xl font-bold mb-2">Ready to Play?</h3>
          <p className="text-muted-foreground mb-4">
            Make sure you have sufficient balance in your account
          </p>
          <Link to="/deposit">
            <Button size="lg" className="animate-glow-pulse">
              Deposit Funds
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
};

export default Games;
