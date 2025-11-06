import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Wallet, TrendingUp, Clock, LogOut, Gamepad2, Shield } from "lucide-react";

interface Profile {
  username: string;
  balance: number;
  deposit_limit: number;
  play_time_limit: number;
}

interface Transaction {
  trans_id: string;
  amount: number;
  trans_type: string;
  trans_time: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      navigate("/login");
      return;
    }

    await loadProfile(user.id);
    await loadTransactions(user.id);
  };

  const loadProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) throw error;
      setProfile(data);
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

  const loadTransactions = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", userId)
        .order("trans_time", { ascending: false })
        .limit(5);

      if (error) throw error;
      setTransactions(data || []);
    } catch (error: any) {
      console.error("Error loading transactions:", error);
    }
  };

  const handleLogout = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      await supabase.from("audit_log").insert({
        user_id: user.id,
        action: "logout",
      });
    }

    await supabase.auth.signOut();
    toast({
      title: "Logged Out",
      description: "See you next time!",
    });
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link to="/" className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Bet<span className="text-primary">Guard</span></h1>
          </Link>
          <Button onClick={handleLogout} variant="outline" size="sm">
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Welcome back, {profile?.username}!</h2>
          <p className="text-muted-foreground">Manage your account and track your activity</p>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Current Balance</CardTitle>
              <Wallet className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">₹{profile?.balance.toFixed(2)}</div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Daily Deposit Limit</CardTitle>
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">₹{profile?.deposit_limit.toFixed(2)}</div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Play Time Limit</CardTitle>
              <Clock className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{profile?.play_time_limit}h</div>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-4 mb-8">
          <Link to="/deposit">
            <Button size="lg" className="animate-glow-pulse">
              <Wallet className="mr-2 h-5 w-5" />
              Deposit Funds
            </Button>
          </Link>
          <Link to="/games">
            <Button size="lg" variant="secondary">
              <Gamepad2 className="mr-2 h-5 w-5" />
              Browse Games
            </Button>
          </Link>
        </div>

        {/* Recent Transactions */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No transactions yet</p>
            ) : (
              <div className="space-y-4">
                {transactions.map((trans) => (
                  <div key={trans.trans_id} className="flex justify-between items-center border-b border-border pb-3 last:border-0">
                    <div>
                      <p className="font-medium capitalize">{trans.trans_type}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(trans.trans_time).toLocaleString()}
                      </p>
                    </div>
                    <div className={`text-lg font-bold ${
                      trans.trans_type === 'deposit' || trans.trans_type === 'win' 
                        ? 'text-primary' 
                        : 'text-destructive'
                    }`}>
                      {trans.trans_type === 'deposit' || trans.trans_type === 'win' ? '+' : '-'}
                      ₹{trans.amount.toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Dashboard;
