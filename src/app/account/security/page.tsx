"use client";

import { useEffect, useState, useMemo } from "react";
import { signOut } from "next-auth/react";
import {
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Check,
  X,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toast";
import { AdminTopBar } from "@/components/layout/AdminTopBar";
import { ConfirmModal } from "@/components/modals/ConfirmModal";

export default function AccountSecurityPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [countdown, setCountdown] = useState(3);

  // Success modal countdown & auto logout
  useEffect(() => {
    if (!showSuccessModal) return;

    if (countdown <= 0) {
      signOut({ callbackUrl: "/login" });
      return;
    }

    const timer = setTimeout(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [showSuccessModal, countdown]);

  // Password Strength Calculation
  const passwordCriteria = useMemo(() => {
    return {
      hasMinLength: newPassword.length >= 8,
      hasLetter: /[a-zA-Z]/.test(newPassword),
      hasNumber: /[0-9]/.test(newPassword),
      hasUppercase: /[A-Z]/.test(newPassword),
      hasSpecial: /[^A-Za-z0-9]/.test(newPassword),
      isMatching: Boolean(newPassword && confirmPassword && newPassword === confirmPassword),
    };
  }, [newPassword, confirmPassword]);

  const strengthScore = useMemo(() => {
    if (!newPassword) return 0;
    let score = 0;
    if (passwordCriteria.hasMinLength) score += 1;
    if (passwordCriteria.hasLetter && passwordCriteria.hasNumber) score += 1;
    if (passwordCriteria.hasUppercase) score += 1;
    if (passwordCriteria.hasSpecial) score += 1;
    return score; // 0 to 4
  }, [newPassword, passwordCriteria]);

  const strengthConfig = useMemo(() => {
    switch (strengthScore) {
      case 1:
        return { label: "Weak", color: "bg-red-500", text: "text-red-500", width: "25%" };
      case 2:
        return { label: "Fair", color: "bg-amber-500", text: "text-amber-500", width: "50%" };
      case 3:
        return { label: "Good", color: "bg-blue-500", text: "text-blue-500", width: "75%" };
      case 4:
        return { label: "Strong", color: "bg-emerald-500", text: "text-emerald-500", width: "100%" };
      default:
        return { label: "Too Weak", color: "bg-muted", text: "text-muted-foreground", width: "0%" };
    }
  }, [strengthScore]);

  const isFormValid =
    Boolean(currentPassword) &&
    passwordCriteria.hasMinLength &&
    passwordCriteria.hasLetter &&
    passwordCriteria.hasNumber &&
    passwordCriteria.isMatching;

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.add({
        title: "Missing Information",
        description: "Please fill in all three password fields.",
        type: "error",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.add({
        title: "Passwords Do Not Match",
        description: "Your new password and confirmation password do not match.",
        type: "error",
      });
      return;
    }

    if (currentPassword === newPassword) {
      toast.add({
        title: "Same Password",
        description: "Your new password must be different from your current password.",
        type: "error",
      });
      return;
    }

    if (!passwordCriteria.hasMinLength || !passwordCriteria.hasLetter || !passwordCriteria.hasNumber) {
      toast.add({
        title: "Password Too Simple",
        description:
          "Please choose a password with at least 8 characters, including both letters and numbers.",
        type: "error",
      });
      return;
    }

    setIsChangingPassword(true);
    try {
      const res = await fetch("/api/account/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to update password.");
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setCountdown(3);
      setShowSuccessModal(true);
    } catch (error) {
      toast.add({
        title: "Could Not Update Password",
        description:
          error instanceof Error ? error.message : "Failed to change password.",
        type: "error",
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <>
      <AdminTopBar
        breadcrumbs={[
          { label: "Account Settings", href: "/account" },
          { label: "Security & Password" },
        ]}
      />

      <div className="flex flex-1 flex-col gap-6 py-6 px-3.75 md:px-5 lg:px-7.5 w-full max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2.5">
            <h2 className="text-2xl font-extrabold text-foreground tracking-tight">
              Security & Password
            </h2>
            <Badge
              variant="outline"
              className="text-[11px] font-semibold text-emerald-600 bg-emerald-500/10 border-emerald-500/20"
            >
              Protected
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Manage your account credentials, login password, and authentication security.
          </p>
        </div>

        {/* Security & Password Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Password Change Form (7 cols) */}
          <div className="lg:col-span-7 rounded-2xl border border-border/80 bg-card p-6 shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <div className="flex items-center gap-2.5">
                <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <KeyRound className="size-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground tracking-tight">
                    Change Password
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Update your password regularly to keep your administrative account secure.
                  </p>
                </div>
              </div>
            </div>

            <form
              id="password-form"
              onSubmit={handleChangePassword}
              className="space-y-4.5"
            >
              {/* Current Password */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="current-password"
                  className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
                >
                  Current Password
                </Label>
                <div className="relative">
                  <Input
                    id="current-password"
                    type={showCurrentPassword ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter your current account password"
                    required
                    disabled={isChangingPassword}
                    className="pr-10 text-sm h-10 bg-background/50 font-mono tracking-wider"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    disabled={isChangingPassword}
                    aria-label={showCurrentPassword ? "Hide password" : "Show password"}
                  >
                    {showCurrentPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* New Password & Confirm Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="new-password"
                    className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
                  >
                    New Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      required
                      disabled={isChangingPassword}
                      className="pr-10 text-sm h-10 bg-background/50 font-mono tracking-wider"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      disabled={isChangingPassword}
                      aria-label={showNewPassword ? "Hide password" : "Show password"}
                    >
                      {showNewPassword ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label
                    htmlFor="confirm-password"
                    className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
                  >
                    Confirm New Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat new password"
                      required
                      disabled={isChangingPassword}
                      className="pr-10 text-sm h-10 bg-background/50 font-mono tracking-wider"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      disabled={isChangingPassword}
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Password Strength Indicator */}
              {newPassword && (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground font-medium">Password Strength:</span>
                    <span className={`font-bold ${strengthConfig.text}`}>
                      {strengthConfig.label}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${strengthConfig.color}`}
                      style={{ width: strengthConfig.width }}
                    />
                  </div>
                </div>
              )}

              {/* Password Requirements Checklist */}
              <div className="rounded-xl bg-muted/40 border border-border/60 p-3.5 space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Security Requirements
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1.5">
                    {passwordCriteria.hasMinLength ? (
                      <Check className="size-3.5 text-emerald-600" />
                    ) : (
                      <X className="size-3.5 text-muted-foreground/60" />
                    )}
                    <span className={passwordCriteria.hasMinLength ? "text-foreground font-medium" : "text-muted-foreground"}>
                      At least 8 characters
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {passwordCriteria.hasLetter && passwordCriteria.hasNumber ? (
                      <Check className="size-3.5 text-emerald-600" />
                    ) : (
                      <X className="size-3.5 text-muted-foreground/60" />
                    )}
                    <span className={passwordCriteria.hasLetter && passwordCriteria.hasNumber ? "text-foreground font-medium" : "text-muted-foreground"}>
                      Letters & numbers
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {passwordCriteria.hasUppercase ? (
                      <Check className="size-3.5 text-emerald-600" />
                    ) : (
                      <span className="size-3.5 inline-block text-center text-muted-foreground/40 font-mono text-[10px]">&bull;</span>
                    )}
                    <span className={passwordCriteria.hasUppercase ? "text-foreground font-medium" : "text-muted-foreground"}>
                      Uppercase letter (recommended)
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {passwordCriteria.isMatching ? (
                      <Check className="size-3.5 text-emerald-600" />
                    ) : (
                      <X className="size-3.5 text-muted-foreground/60" />
                    )}
                    <span className={passwordCriteria.isMatching ? "text-foreground font-medium" : "text-muted-foreground"}>
                      Passwords match
                    </span>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-4 border-t border-border/60 flex items-center justify-between">
                <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Lock className="size-3.5" />
                  <span>Encrypted end-to-end</span>
                </span>

                <Button
                  type="submit"
                  disabled={isChangingPassword || !isFormValid}
                  className="h-10 px-6 text-sm font-semibold shadow-xs hover:shadow-md transition-all cursor-pointer"
                >
                  {isChangingPassword ? (
                    <>
                      <Loader2 className="size-4 mr-2 animate-spin" /> Updating...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="size-4 mr-2" /> Update Password
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>

          {/* Right Column: Security Advisory & Guidelines (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2.5 pb-2 border-b border-border/60">
                <div className="size-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                  <Shield className="size-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground">
                    Account Protection
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Best practices for CMS administrators
                  </p>
                </div>
              </div>

              <div className="space-y-3 text-xs text-muted-foreground leading-relaxed">
                <div className="flex items-start gap-2.5">
                  <Check className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                  <p>
                    <strong className="text-foreground">Unique Passwords:</strong> Avoid reusing passwords from other personal or work services.
                  </p>
                </div>

                <div className="flex items-start gap-2.5">
                  <Check className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                  <p>
                    <strong className="text-foreground">Automatic Session Revocation:</strong> When you update your password, your active login tokens are refreshed and other sessions may require re-authenticating.
                  </p>
                </div>

                <div className="flex items-start gap-2.5">
                  <Check className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                  <p>
                    <strong className="text-foreground">Audit Traceability:</strong> All credential modifications are logged for accountability and security reviews.
                  </p>
                </div>
              </div>

              <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3.5 flex items-start gap-2.5 text-xs text-amber-700 dark:text-amber-400">
                <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                <p>
                  You will be automatically logged out upon changing your password and redirected to sign in with your new credentials.
                </p>
              </div>
            </div>

            {/* Quick Link to Sessions */}
            <div className="rounded-xl border border-dashed border-border/80 p-4 text-xs text-muted-foreground flex items-start gap-2.5">
              <ShieldAlert className="size-4 shrink-0 text-primary mt-0.5" />
              <div className="space-y-1">
                <p className="font-medium text-foreground">Suspicious login activity?</p>
                <p>
                  Check which devices are currently connected to your account in{" "}
                  <a href="/account/sessions" className="text-primary hover:underline font-semibold">
                    Active Sessions
                  </a>{" "}
                  and revoke unauthorized logins immediately.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Password Changed Success Modal */}
      <ConfirmModal
        open={showSuccessModal}
        onOpenChange={() => {}}
        variant="success"
        title="Password Changed Successfully!"
        description="Your new password is now active"
        confirmText="Sign in now"
        hideCancel
        onConfirm={() => signOut({ callbackUrl: "/login" })}
      >
        <div className="py-2 text-xs text-muted-foreground leading-relaxed space-y-2">
          <p>
            Changing your password signs you out of this session. You will need to log in again with your new password to continue.
          </p>
          <p className="text-xs text-muted-foreground/80 font-medium">
            Redirecting to login in <span className="font-semibold text-foreground font-mono">{countdown}</span> seconds...
          </p>
        </div>
      </ConfirmModal>
    </>
  );
}
