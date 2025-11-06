import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ShieldCheck, Loader2 } from "lucide-react";

const AdminLogin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Check if user is admin
      if (data.user) {
        const { data: roleData, error: roleError } = await supabase
          .rpc("has_role", { _user_id: data.user.id, _role: "admin" });

        if (roleError) throw roleError;

        if (!roleData) {
          await supabase.auth.signOut();
          throw new Error("Access denied. Admin privileges required.");
        }

        // Check if user is banned
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("is_banned, ban_reason")
          .eq("id", data.user.id)
          .single();

        if (profileError) throw profileError;

        if (profile?.is_banned) {
          await supabase.auth.signOut();
          throw new Error(profile.ban_reason || "Your account has been banned.");
        }

        // Log audit entry
        await supabase.from("audit_log").insert({
          user_id: data.user.id,
          action: "admin_login",
        });

        // Update last login
        await supabase
          .from("profiles")
          .update({ last_login: new Date().toISOString() })
          .eq("id", data.user.id);
      }

      toast({
        title: "Welcome Admin!",
        description: "Redirecting to admin panel...",
      });

      setTimeout(() => navigate("/admin"), 1000);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-border">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <ShieldCheck className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-3xl">Admin <span className="text-primary">Login</span></CardTitle>
          <CardDescription>Secure access for administrators only</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Admin Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@betguard.com"
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                disabled={loading}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Login as Admin"
              )}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Need admin access?{" "}
              <Link to="/admin-register" className="text-primary hover:underline">
                Register here
              </Link>
            </p>
            
            <p className="text-center text-sm text-muted-foreground">
              <Link to="/" className="text-primary hover:underline">
                Back to Home
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminLogin;
