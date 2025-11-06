import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ShieldCheck, Loader2 } from "lucide-react";
import { z } from "zod";

const ADMIN_SECRET_CODE = "Haindav@1";

const adminRegisterSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
  secretCode: z.string().min(1, "Secret code is required"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
}).refine((data) => data.secretCode === ADMIN_SECRET_CODE, {
  message: "Invalid admin secret code",
  path: ["secretCode"],
});

const AdminRegister = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    secretCode: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    try {
      // Validate form data
      const validatedData = adminRegisterSchema.parse(formData);

      // Create user account
      const { data, error } = await supabase.auth.signUp({
        email: validatedData.email,
        password: validatedData.password,
        options: {
          data: {
            username: validatedData.username,
          },
          emailRedirectTo: `${window.location.origin}/admin`,
        },
      });

      if (error) throw error;

      if (data.user) {
        // Assign admin role
        const { error: roleError } = await supabase
          .from("user_roles")
          .insert({
            user_id: data.user.id,
            role: "admin",
          });

        if (roleError) {
          console.error("Role assignment error:", roleError);
          // Continue anyway as the trigger should handle this
        }

        // Log audit entry
        await supabase.from("audit_log").insert({
          user_id: data.user.id,
          action: "admin_register",
        });

        toast({
          title: "Admin Account Created!",
          description: "Redirecting to admin login...",
        });

        setTimeout(() => navigate("/admin-login"), 1500);
      }
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path) {
            fieldErrors[err.path[0]] = err.message;
          }
        });
        setErrors(fieldErrors);
      } else {
        toast({
          variant: "destructive",
          title: "Registration Failed",
          description: error.message,
        });
      }
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
          <CardTitle className="text-3xl">Admin <span className="text-primary">Registration</span></CardTitle>
          <CardDescription>Create an administrator account with secret code</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="adminuser"
                required
                disabled={loading}
              />
              {errors.username && (
                <p className="text-sm text-destructive">{errors.username}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="admin@betguard.com"
                required
                disabled={loading}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="••••••••"
                required
                disabled={loading}
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                placeholder="••••••••"
                required
                disabled={loading}
              />
              {errors.confirmPassword && (
                <p className="text-sm text-destructive">{errors.confirmPassword}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="secretCode">Admin Secret Code</Label>
              <Input
                id="secretCode"
                type="password"
                value={formData.secretCode}
                onChange={(e) => setFormData({ ...formData, secretCode: e.target.value })}
                placeholder="Enter admin secret code"
                required
                disabled={loading}
              />
              {errors.secretCode && (
                <p className="text-sm text-destructive">{errors.secretCode}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Admin Account...
                </>
              ) : (
                "Register as Admin"
              )}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Already have an admin account?{" "}
              <Link to="/admin-login" className="text-primary hover:underline">
                Login here
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

export default AdminRegister;
