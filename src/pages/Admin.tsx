import { useEffect, useState } from "react";
import PlayerDetailsModal from "@/components/PlayerDetailsModal";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Shield, Users, DollarSign, Activity, ArrowLeft, RefreshCw } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Stats {
  totalUsers: number;
  totalDeposits: number;
  activeUsers: number;
  totalBets: number;
  totalWins: number;
  platformProfit: number;
}

interface User {
  id: string;
  username: string;
  balance: number;
  deposit_limit: number;
  created_at: string;
}

interface Transaction {
  trans_id: string;
  user_id: string;
  username: string;
  amount: number;
  trans_type: string;
  trans_time: string;
}

interface AuditLog {
  log_id: string;
  user_id: string;
  username: string;
  action: string;
  log_time: string;
}

const Admin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalDeposits: 0,
    activeUsers: 0,
    totalBets: 0,
    totalWins: 0,
    platformProfit: 0,
  });
  const [users, setUsers] = useState<User[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      navigate("/admin-login");
      return;
    }

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const hasAdminRole = roles?.some(r => r.role === "admin");

    if (!hasAdminRole) {
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: "You don't have admin privileges",
      });
      navigate("/dashboard");
      return;
    }

    setIsAdmin(true);
    loadAdminData();
  };

  const loadAdminData = async () => {
    setLoading(true);
    try {
      // Load statistics
      const { data: profilesData } = await supabase.from("profiles").select("*");
      const { data: transData } = await supabase.from("transactions").select("*");
      const { data: auditData } = await supabase
        .from("audit_log")
        .select("*, profiles(username)")
        .order("log_time", { ascending: false })
        .limit(50);

      const totalUsers = profilesData?.length || 0;
      const totalDeposits = transData
        ?.filter(t => t.trans_type === "deposit")
        .reduce((sum, t) => sum + Number(t.amount), 0) || 0;
      
      const totalBets = transData
        ?.filter(t => t.trans_type === "bet")
        .reduce((sum, t) => sum + Number(t.amount), 0) || 0;
      
      const totalWins = transData
        ?.filter(t => t.trans_type === "win")
        .reduce((sum, t) => sum + Number(t.amount), 0) || 0;

      const now = new Date();
      const fiveMinAgo = new Date(now.getTime() - 5 * 60000);
      const activeUsers = auditData?.filter(
        log => new Date(log.log_time) > fiveMinAgo
      ).length || 0;

      setStats({
        totalUsers,
        totalDeposits,
        activeUsers,
        totalBets,
        totalWins,
        platformProfit: totalBets - totalWins,
      });

      // Load users
      const usersWithData = profilesData?.map(p => ({
        id: p.id,
        username: p.username,
        balance: Number(p.balance),
        deposit_limit: Number(p.deposit_limit),
        created_at: p.created_at,
      })) || [];
      setUsers(usersWithData.sort((a, b) => b.balance - a.balance));

      // Load recent transactions
      const { data: recentTrans } = await supabase
        .from("transactions")
        .select("*, profiles(username)")
        .order("trans_time", { ascending: false })
        .limit(50);

      const transWithUsername = recentTrans?.map(t => ({
        trans_id: t.trans_id,
        user_id: t.user_id,
        username: (t.profiles as any)?.username || "Unknown",
        amount: Number(t.amount),
        trans_type: t.trans_type,
        trans_time: t.trans_time,
      })) || [];
      setTransactions(transWithUsername);

      // Load audit logs
      const logsWithUsername = auditData?.map(log => ({
        log_id: log.log_id,
        user_id: log.user_id,
        username: (log.profiles as any)?.username || "Unknown",
        action: log.action,
        log_time: log.log_time,
      })) || [];
      setAuditLogs(logsWithUsername);

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

  const openPlayerDetails = (userId: string) => {
    setSelectedPlayerId(userId);
    setIsModalOpen(true);
  };

  if (loading || !isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">
              Bet<span className="text-primary">Guard</span> Admin
            </h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={loadAdminData}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Link to="/dashboard">
              <Button variant="outline" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Deposits</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{stats.totalDeposits.toFixed(2)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active Now</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeUsers}</div>
              <p className="text-xs text-muted-foreground">Last 5 minutes</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Bets</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{stats.totalBets.toFixed(2)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Wins</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{stats.totalWins.toFixed(2)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Platform Profit</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">₹{stats.platformProfit.toFixed(2)}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="users" className="space-y-4">
          <TabsList>
            <TabsTrigger value="users">All Users</TabsTrigger>
            <TabsTrigger value="transactions">Recent Transactions</TabsTrigger>
            <TabsTrigger value="activity">Live Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>All Users</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Username</TableHead>
                      <TableHead>Balance</TableHead>
                      <TableHead>Deposit Limit</TableHead>
                      <TableHead>Joined</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow 
                        key={user.id} 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => openPlayerDetails(user.id)}
                      >
                        <TableCell className="font-medium text-primary">{user.username}</TableCell>
                        <TableCell>₹{user.balance.toFixed(2)}</TableCell>
                        <TableCell>₹{user.deposit_limit.toFixed(2)}</TableCell>
                        <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transactions">
            <Card>
              <CardHeader>
                <CardTitle>Recent Transactions</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Username</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((trans) => (
                      <TableRow key={trans.trans_id}>
                        <TableCell className="font-medium">{trans.username}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded text-xs ${
                            trans.trans_type === "deposit" ? "bg-green-100 text-green-800" :
                            trans.trans_type === "win" ? "bg-blue-100 text-blue-800" :
                            trans.trans_type === "bet" ? "bg-orange-100 text-orange-800" :
                            "bg-gray-100 text-gray-800"
                          }`}>
                            {trans.trans_type}
                          </span>
                        </TableCell>
                        <TableCell>₹{trans.amount.toFixed(2)}</TableCell>
                        <TableCell>{new Date(trans.trans_time).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity">
            <Card>
              <CardHeader>
                <CardTitle>Live Player Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Username</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditLogs.map((log) => (
                      <TableRow key={log.log_id}>
                        <TableCell className="font-medium">{log.username}</TableCell>
                        <TableCell>{log.action}</TableCell>
                        <TableCell>{new Date(log.log_time).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <PlayerDetailsModal
        playerId={selectedPlayerId}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onPlayerUpdate={loadAdminData}
      />
    </div>
  );
};

export default Admin;
