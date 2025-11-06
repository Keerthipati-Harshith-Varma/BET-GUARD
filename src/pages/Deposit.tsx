import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Wallet, Shield, ArrowLeft } from "lucide-react";

const Deposit = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState("");
  const [depositLimit, setDepositLimit] = useState(1000);
  const [todayDeposits, setTodayDeposits] = useState(0);

  useEffect(() => {
    checkUserAndLoadData();
  }, []);

  const checkUserAndLoadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      navigate("/login");
      return;
    }

    await loadDepositInfo(user.id);
  };

  const loadDepositInfo = async (userId: string) => {
    try {
      // Get user's deposit limit
      const { data: profile } = await supabase
        .from("profiles")
        .select("deposit_limit")
        .eq("id", userId)
        .single();

      if (profile) {
        setDepositLimit(profile.deposit_limit);
      }

      // Calculate today's deposits
      const today = new Date().toISOString().split('T')[0];
      const { data: transactions } = await supabase
        .from("transactions")
        .select("amount")
        .eq("user_id", userId)
        .eq("trans_type", "deposit")
        .gte("trans_time", today);

      if (transactions) {
        const total = transactions.reduce((sum, t) => sum + Number(t.amount), 0);
        setTodayDeposits(total);
      }
    } catch (error: any) {
      console.error("Error loading deposit info:", error);
    }
  };

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const depositAmount = parseFloat(amount);
    if (isNaN(depositAmount) || depositAmount <= 0) {
      toast({
        variant: "destructive",
        title: "Invalid Amount",
        description: "Please enter a valid amount",
      });
      return;
    }

    if (todayDeposits + depositAmount > depositLimit) {
      toast({
        variant: "destructive",
        title: "Deposit Limit Exceeded",
        description: `You can only deposit ₹${(depositLimit - todayDeposits).toFixed(2)} more today.`,
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not found");

      const { error } = await supabase.from("transactions").insert({
        user_id: user.id,
        amount: depositAmount,
        trans_type: "deposit",
      });

      if (error) throw error;

      // Log audit entry
      await supabase.from("audit_log").insert({
        user_id: user.id,
        action: `deposit of ₹${depositAmount}`,
      });

      toast({
        title: "Deposit Successful!",
        description: `₹${depositAmount.toFixed(2)} has been added to your account.`,
      });

      setTimeout(() => navigate("/dashboard"), 1500);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Deposit Failed",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const remainingLimit = depositLimit - todayDeposits;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link to="/dashboard" className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Bet<span className="text-primary">Guard</span></h1>
          </Link>
          <Link to="/dashboard">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 flex justify-center">
        <Card className="w-full max-w-md border-border">
          <CardHeader className="space-y-4 text-center">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <Wallet className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-3xl">Deposit Funds</CardTitle>
            <CardDescription>Add money to your BetGuard account</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-6 p-4 bg-muted rounded-lg">
              <div className="flex justify-between mb-2">
                <span className="text-sm text-muted-foreground">Today's Deposits:</span>
                <span className="font-semibold">₹{todayDeposits.toFixed(2)}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-sm text-muted-foreground">Daily Limit:</span>
                <span className="font-semibold">₹{depositLimit.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Remaining:</span>
                <span className="font-semibold text-primary">₹{remainingLimit.toFixed(2)}</span>
              </div>
            </div>

            <form onSubmit={handleDeposit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="amount">Deposit Amount (₹)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  max={remainingLimit}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter amount"
                  required
                  disabled={loading || remainingLimit <= 0}
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[100, 500, 1000].map((preset) => (
                  <Button
                    key={preset}
                    type="button"
                    variant="outline"
                    onClick={() => setAmount(String(Math.min(preset, remainingLimit)))}
                    disabled={loading || remainingLimit <= 0}
                  >
                    ₹{preset}
                  </Button>
                ))}
              </div>

              {remainingLimit > 0 && (
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Select Payment Method (Demo)</Label>
                  <div className="grid gap-3">
                    <div className="p-4 border border-border rounded-lg bg-muted/50">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                          <Wallet className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold">UPI Payment</p>
                          <p className="text-xs text-muted-foreground">Pay via UPI ID or QR Code</p>
                        </div>
                      </div>
                      <Input 
                        placeholder="Enter UPI ID (Demo: 7013220835@ybl)" 
                        className="text-sm"
                        disabled={loading}
                      />
                    </div>

                    <div className="p-4 border border-border rounded-lg bg-muted/50">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                          💳
                        </div>
                        <div>
                          <p className="font-semibold">Debit/Credit Card</p>
                          <p className="text-xs text-muted-foreground">Visa, Mastercard, RuPay</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Input placeholder="Card Number" disabled={loading} className="text-sm" />
                        <div className="grid grid-cols-2 gap-2">
                          <Input placeholder="MM/YY" disabled={loading} className="text-sm" />
                          <Input placeholder="CVV" disabled={loading} className="text-sm" />
                        </div>
                      </div>
                    </div>

                    <div className="p-4 border border-border rounded-lg bg-muted/50">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                          🏦
                        </div>
                        <div>
                          <p className="font-semibold">Net Banking</p>
                          <p className="text-xs text-muted-foreground">All major banks supported</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {remainingLimit <= 0 ? (
                <div className="p-4 bg-destructive/10 text-destructive rounded-lg text-sm">
                  You've reached your daily deposit limit. Please try again tomorrow.
                </div>
              ) : (
                <Button type="submit" className="w-full" disabled={loading} size="lg">
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing Payment...
                    </>
                  ) : (
                    <>
                      <Wallet className="mr-2 h-4 w-4" />
                      Complete Deposit (Demo)
                    </>
                  )}
                </Button>
              )}

              <p className="text-xs text-center text-muted-foreground">
                🔒 This is a demo payment system. No real money transactions occur.
              </p>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Deposit;
