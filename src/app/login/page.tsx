"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Eye, EyeOff, Mail, Lock, Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toast";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        toast.add({
          title: "Authentication Failed",
          description: "Invalid email or password. Please check your credentials.",
          type: "error",
        });
        setLoading(false);
      } else {
        toast.add({
          title: "Welcome Back",
          description: "Successfully authenticated. Redirecting to dashboard...",
          type: "success",
        });
        router.push("/webpages");
        router.refresh();
      }
    } catch (error) {
      toast.add({
        title: "Connection Error",
        description: "An unexpected error occurred. Please try again later.",
        type: "error",
      });
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-background px-4 py-12 overflow-hidden selection:bg-primary selection:text-primary-foreground">
      {/* Background Subtle Radial Decorators */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-primary/5 via-primary/2 to-transparent pointer-events-none blur-3xl" />
      <div className="absolute -top-40 -right-40 size-96 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 size-96 rounded-full bg-primary/5 blur-3xl pointer-events-none" />

      {/* Main Login Card */}
      <div className="relative w-full max-w-md rounded-sm border border-border bg-card/95 backdrop-blur-md p-8 shadow-xl transition-all">
        {/* Header Branding */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="p-3 rounded-sm bg-muted/80 border border-border/80 shadow-2xs">
            <Image
              src="/logo.png"
              alt="YS CMS Logo"
              width={160}
              height={36}
              className="h-8 w-auto object-contain dark:invert"
              priority
            />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-foreground">
              Sign in to CMS
            </h1>
            <p className="mt-1 text-xs text-muted-foreground font-medium">
              Enter your credentials to access the admin portal
            </p>
          </div>
        </div>

        {/* Login Form */}
        <form className="mt-8 space-y-5" onSubmit={handleLogin}>
          <div className="space-y-4">
            {/* Email Field */}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-foreground">
                Email Address
              </Label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground">
                  <Mail className="size-4" />
                </div>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="pl-9.5 h-11 text-sm rounded-sm border-border bg-background transition-colors focus-visible:ring-1"
                  placeholder="your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-bold uppercase tracking-wider text-foreground">
                Password
              </Label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground">
                  <Lock className="size-4" />
                </div>
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  className="pl-9.5 pr-10 h-11 text-sm rounded-sm border-border bg-background transition-colors focus-visible:ring-1"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                >
                  {showPassword ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <Button
              type="submit"
              className="w-full h-11 text-xs font-bold uppercase tracking-wider rounded-sm shadow-md transition-all cursor-pointer group flex items-center justify-center gap-2"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Sign in</span>
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
