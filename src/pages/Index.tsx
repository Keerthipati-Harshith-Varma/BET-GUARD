import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Shield, TrendingUp, Lock, Users } from "lucide-react";
import heroBanner from "@/assets/hero-banner.jpg";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-40"
          style={{ backgroundImage: `url(${heroBanner})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/50 to-background" />
        
        <div className="relative z-10 container mx-auto px-4 text-center">
          <h1 className="text-6xl md:text-8xl font-bold mb-6 animate-fade-in">
            Bet<span className="text-primary">Guard</span>
          </h1>
          <p className="text-2xl md:text-3xl mb-4 text-muted-foreground animate-fade-in" style={{ animationDelay: '0.1s' }}>
            Play Smart. Bet Safe.
          </p>
          <p className="text-lg mb-12 text-muted-foreground max-w-2xl mx-auto animate-fade-in" style={{ animationDelay: '0.2s' }}>
            Your trusted platform for responsible online betting with advanced security and transparent limits.
          </p>
          
          <div className="flex flex-wrap gap-4 justify-center animate-slide-up" style={{ animationDelay: '0.3s' }}>
            <Link to="/register">
              <Button size="lg" className="animate-glow-pulse">
                Get Started
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="secondary">
                Login
              </Button>
            </Link>
            <Link to="/games">
              <Button size="lg" variant="outline">
                Browse Games
              </Button>
            </Link>
            <Link to="/admin-login">
              <Button size="lg" variant="secondary">
                Admin Login
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <h2 className="text-4xl font-bold text-center mb-16">
            Why Choose <span className="text-primary">BetGuard</span>?
          </h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-card p-8 rounded-lg border border-border hover:border-primary transition-all hover:shadow-[var(--shadow-glow)]">
              <Shield className="w-12 h-12 text-primary mb-4" />
              <h3 className="text-xl font-bold mb-3">Secure Platform</h3>
              <p className="text-muted-foreground">
                Bank-level encryption and security measures protect your data and funds.
              </p>
            </div>

            <div className="bg-card p-8 rounded-lg border border-border hover:border-primary transition-all hover:shadow-[var(--shadow-glow)]">
              <Lock className="w-12 h-12 text-primary mb-4" />
              <h3 className="text-xl font-bold mb-3">Responsible Gaming</h3>
              <p className="text-muted-foreground">
                Daily deposit limits and play time controls to keep your betting healthy.
              </p>
            </div>

            <div className="bg-card p-8 rounded-lg border border-border hover:border-primary transition-all hover:shadow-[var(--shadow-glow)]">
              <TrendingUp className="w-12 h-12 text-primary mb-4" />
              <h3 className="text-xl font-bold mb-3">Transparent Tracking</h3>
              <p className="text-muted-foreground">
                Complete transaction history and real-time balance updates at your fingertips.
              </p>
            </div>

            <div className="bg-card p-8 rounded-lg border border-border hover:border-primary transition-all hover:shadow-[var(--shadow-glow)]">
              <Users className="w-12 h-12 text-primary mb-4" />
              <h3 className="text-xl font-bold mb-3">Trusted Community</h3>
              <p className="text-muted-foreground">
                Join thousands of players who trust BetGuard for fair and secure betting.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>&copy; 2024 BetGuard. Play responsibly. 18+ only.</p>
          <div className="mt-4 space-x-4">
            <Link to="/responsible-gaming" className="hover:text-primary transition-colors">
              Responsible Gaming
            </Link>
            <Link to="/about" className="hover:text-primary transition-colors">
              About Us
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
