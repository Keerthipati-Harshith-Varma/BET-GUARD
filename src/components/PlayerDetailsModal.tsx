import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Ban, CheckCircle, AlertTriangle, TrendingUp, DollarSign, Send } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

interface PlayerDetailsModalProps {
  playerId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onPlayerUpdate: () => void;
}

export const PlayerDetailsModal = ({ playerId, isOpen, onClose, onPlayerUpdate }: PlayerDetailsModalProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [playerData, setPlayerData] = useState<any>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [sendingAdvice, setSendingAdvice] = useState(false);
  const [adminMessage, setAdminMessage] = useState("");
  const [aiAdvice, setAiAdvice] = useState("");

  useEffect(() => {
    if (playerId && isOpen) {
      loadPlayerData();
    }
  }, [playerId, isOpen]);

  const loadPlayerData = async () => {
    if (!playerId) return;
    
    setLoading(true);
    try {
      // Load profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', playerId)
        .single();

      if (profileError) throw profileError;

      // Load transactions
      const { data: transactions, error: transError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', playerId)
        .order('trans_time', { ascending: false });

      if (transError) throw transError;

      // Load audit logs
      const { data: auditLogs, error: auditError } = await supabase
        .from('audit_log')
        .select('*')
        .eq('user_id', playerId)
        .order('log_time', { ascending: false })
        .limit(50);

      if (auditError) throw auditError;

      setPlayerData({
        profile,
        transactions: transactions || [],
        auditLogs: auditLogs || []
      });
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

  const analyzePlayer = async () => {
    if (!playerId) return;
    
    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-player', {
        body: { userId: playerId }
      });

      if (error) throw error;

      setAnalysis(data.analysis);
      
      toast({
        title: "Analysis Complete",
        description: "AI-powered player analysis generated successfully",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Analysis Failed",
        description: error.message,
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const sendPlayerAdvice = async () => {
    if (!playerId || !adminMessage.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter a message",
      });
      return;
    }

    setSendingAdvice(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-player-advice', {
        body: { userId: playerId, adminMessage }
      });

      if (error) throw error;

      setAiAdvice(data.advice);
      
      toast({
        title: "AI Advice Generated",
        description: "Personalized advice has been created for the player",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to Generate Advice",
        description: error.message,
      });
    } finally {
      setSendingAdvice(false);
    }
  };

  const toggleBanStatus = async () => {
    if (!playerId || !playerData) return;

    try {
      const newBanStatus = !playerData.profile.is_banned;
      const { error } = await supabase
        .from('profiles')
        .update({
          is_banned: newBanStatus,
          ban_reason: newBanStatus ? 'Banned by admin' : null,
          banned_at: newBanStatus ? new Date().toISOString() : null
        })
        .eq('id', playerId);

      if (error) throw error;

      // Log the action
      await supabase.from('audit_log').insert({
        user_id: playerId,
        action: newBanStatus ? 'player_banned' : 'player_unbanned'
      });

      toast({
        title: newBanStatus ? "Player Banned" : "Player Unbanned",
        description: `Player has been ${newBanStatus ? 'banned' : 'unbanned'} successfully`,
      });

      onPlayerUpdate();
      loadPlayerData();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  if (!playerId) return null;

  const getRiskColor = (score: number) => {
    if (score >= 70) return 'text-red-500';
    if (score >= 50) return 'text-orange-500';
    if (score >= 30) return 'text-yellow-500';
    return 'text-green-500';
  };

  const prepareChartData = () => {
    if (!playerData?.transactions) return [];
    
    const dailyData = playerData.transactions.reduce((acc: any, trans: any) => {
      const date = new Date(trans.trans_time).toLocaleDateString();
      if (!acc[date]) {
        acc[date] = { date, bets: 0, wins: 0, deposits: 0 };
      }
      if (trans.trans_type === 'bet') acc[date].bets += Number(trans.amount);
      if (trans.trans_type === 'win') acc[date].wins += Number(trans.amount);
      if (trans.trans_type === 'deposit') acc[date].deposits += Number(trans.amount);
      return acc;
    }, {});

    return Object.values(dailyData).reverse().slice(-14);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Player Details & Analysis</DialogTitle>
          <DialogDescription>
            Comprehensive player information and AI-powered behavior analysis
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : playerData ? (
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="transactions">Transactions</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
              <TabsTrigger value="analysis">AI Analysis</TabsTrigger>
              <TabsTrigger value="advice">Send Advice</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Player Info</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Username</p>
                      <p className="font-semibold">{playerData.profile.username}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Balance</p>
                      <p className="font-semibold">₹{playerData.profile.balance}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      <Badge variant={playerData.profile.is_banned ? "destructive" : "default"}>
                        {playerData.profile.is_banned ? "Banned" : "Active"}
                      </Badge>
                    </div>
                    {playerData.profile.last_login && (
                      <div>
                        <p className="text-sm text-muted-foreground">Last Login</p>
                        <p className="text-sm">{new Date(playerData.profile.last_login).toLocaleString()}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Limits</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Daily Deposit Limit</p>
                      <p className="font-semibold">₹{playerData.profile.deposit_limit}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Play Time Limit</p>
                      <p className="font-semibold">{playerData.profile.play_time_limit}h/day</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Statistics</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Transactions</p>
                      <p className="font-semibold">{playerData.transactions.length}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Bets</p>
                      <p className="font-semibold">
                        ₹{playerData.transactions.filter((t: any) => t.trans_type === 'bet').reduce((sum: number, t: any) => sum + Number(t.amount), 0).toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Wins</p>
                      <p className="font-semibold text-green-500">
                        ₹{playerData.transactions.filter((t: any) => t.trans_type === 'win').reduce((sum: number, t: any) => sum + Number(t.amount), 0).toFixed(2)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Activity Chart (Last 14 Days)</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={{
                    bets: { label: "Bets", color: "hsl(var(--destructive))" },
                    wins: { label: "Wins", color: "hsl(var(--primary))" },
                    deposits: { label: "Deposits", color: "hsl(var(--secondary))" }
                  }} className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={prepareChartData()}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Legend />
                        <Line type="monotone" dataKey="bets" stroke="var(--color-bets)" />
                        <Line type="monotone" dataKey="wins" stroke="var(--color-wins)" />
                        <Line type="monotone" dataKey="deposits" stroke="var(--color-deposits)" />
                      </LineChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>

              <div className="flex gap-2">
                <Button 
                  onClick={toggleBanStatus}
                  variant={playerData.profile.is_banned ? "default" : "destructive"}
                  className="flex-1"
                >
                  {playerData.profile.is_banned ? (
                    <><CheckCircle className="w-4 h-4 mr-2" /> Unban Player</>
                  ) : (
                    <><Ban className="w-4 h-4 mr-2" /> Ban Player</>
                  )}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="transactions">
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="border-b">
                        <tr className="bg-muted/50">
                          <th className="px-4 py-2 text-left">Date</th>
                          <th className="px-4 py-2 text-left">Type</th>
                          <th className="px-4 py-2 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {playerData.transactions.map((trans: any) => (
                          <tr key={trans.trans_id} className="border-b">
                            <td className="px-4 py-2 text-sm">
                              {new Date(trans.trans_time).toLocaleString()}
                            </td>
                            <td className="px-4 py-2">
                              <Badge variant={trans.trans_type === 'win' ? 'default' : trans.trans_type === 'bet' ? 'destructive' : 'secondary'}>
                                {trans.trans_type}
                              </Badge>
                            </td>
                            <td className="px-4 py-2 text-right font-semibold">
                              ₹{Number(trans.amount).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="activity">
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="border-b">
                        <tr className="bg-muted/50">
                          <th className="px-4 py-2 text-left">Time</th>
                          <th className="px-4 py-2 text-left">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {playerData.auditLogs.map((log: any) => (
                          <tr key={log.log_id} className="border-b">
                            <td className="px-4 py-2 text-sm">
                              {new Date(log.log_time).toLocaleString()}
                            </td>
                            <td className="px-4 py-2">
                              <Badge variant="outline">{log.action}</Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="analysis" className="space-y-4">
              {!analysis ? (
                <Card>
                  <CardContent className="py-12 text-center">
                  <div className="space-y-4">
                    <Button onClick={analyzePlayer} disabled={analyzing} className="w-full">
                      {analyzing ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing...</>
                      ) : (
                        <><TrendingUp className="w-4 h-4 mr-2" /> Run AI Analysis</>
                      )}
                    </Button>
                    <p className="text-sm text-muted-foreground text-center">
                      Generate AI-powered insights and risk assessment
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Risk Assessment</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-center">
                          <div className={`text-6xl font-bold ${getRiskColor(analysis.riskScore)}`}>
                            {analysis.riskScore}
                          </div>
                          <p className="text-sm text-muted-foreground mt-2">Risk Score</p>
                          <Badge className="mt-4" variant={analysis.riskScore > 70 ? "destructive" : "default"}>
                            {analysis.recommendation}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Risk Flags</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {Object.entries(analysis.flags || {}).map(([key, value]: [string, any]) => (
                          <div key={key} className="flex items-center justify-between">
                            <span className="text-sm capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                            {value ? (
                              <AlertTriangle className="w-4 h-4 text-destructive" />
                            ) : (
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            )}
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  </div>

                  {analysis.aiInsights && (
                    <Card>
                      <CardHeader>
                        <CardTitle>AI Insights</CardTitle>
                        <CardDescription>Powered by Gemini AI</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="prose prose-sm max-w-none">
                          <pre className="whitespace-pre-wrap font-sans text-sm">
                            {analysis.aiInsights}
                          </pre>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <Button onClick={analyzePlayer} variant="outline" className="w-full">
                    <TrendingUp className="w-4 h-4 mr-2" /> Refresh Analysis
                  </Button>
                </>
              )}
            </TabsContent>

            <TabsContent value="advice" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Send AI-Powered Advice to Player</CardTitle>
                  <CardDescription>
                    Describe your concerns or what you want to communicate, and AI will generate personalized responsible gaming advice
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="admin-message">Your Message/Concern</Label>
                    <Textarea
                      id="admin-message"
                      placeholder="e.g., 'This player has been losing consistently and increasing bet sizes. I'm concerned about problem gambling patterns.'"
                      value={adminMessage}
                      onChange={(e) => setAdminMessage(e.target.value)}
                      rows={4}
                      disabled={sendingAdvice}
                    />
                  </div>
                  <Button 
                    onClick={sendPlayerAdvice} 
                    disabled={sendingAdvice || !adminMessage.trim()}
                    className="w-full"
                  >
                    {sendingAdvice ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating Advice...</>
                    ) : (
                      <><Send className="w-4 h-4 mr-2" /> Generate AI Advice</>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {aiAdvice && (
                <Card>
                  <CardHeader>
                    <CardTitle>AI-Generated Advice</CardTitle>
                    <CardDescription>
                      Share this personalized advice with the player
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="p-4 bg-muted rounded-lg">
                      <pre className="whitespace-pre-wrap font-sans text-sm">
                        {aiAdvice}
                      </pre>
                    </div>
                    <p className="text-xs text-muted-foreground mt-4">
                      Note: This advice has been logged in the audit trail. You can copy and send this to the player through your preferred communication channel.
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};

export default PlayerDetailsModal;
