"use client";

import { useState, useRef, useMemo } from "react";
import Image from "next/image";
import { useDirtyManager, deepEqual } from "@/hooks/useDirtyManager";
import {
  Camera,
  Check,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  PenTool,
  ShieldCheck,
  Sparkles,
  User as UserIcon,
  UserCog,
  UserPlus,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import type { User } from "@/app/users/users-columns";
import { useSession } from "next-auth/react";

export interface UserModalProps {
  user?: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface UserFormProps {
  user?: User | null;
  onClose: () => void;
  onSuccess: () => void;
}

function generateStrongPassword(): string {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%&*";
  let gen = "";
  if (typeof window !== "undefined" && window.crypto) {
    const array = new Uint32Array(12);
    window.crypto.getRandomValues(array);
    for (let i = 0; i < 12; i++) {
      gen += chars.charAt(array[i] % chars.length);
    }
  } else {
    for (let i = 0; i < 12; i++) {
      gen += chars.charAt(Math.floor(Math.random() * chars.length));
    }
  }
  if (!/[0-9]/.test(gen)) gen += "7";
  if (!/[a-zA-Z]/.test(gen)) gen += "X";
  return gen;
}

function UserForm({ user, onClose, onSuccess }: UserFormProps) {
  const { data: session, update: updateSession } = useSession();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEdit = !!user;
  const isCurrentUser = isEdit && session?.user?.id === user.id;

  const [loading, setLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);

  // Form states initialized directly from props
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"ADMIN" | "EDITOR">(user?.role || "EDITOR");
  const [authorRole, setAuthorRole] = useState(user?.authorRole || "");
  const [description, setDescription] = useState(user?.description || "");
  const [profilePicture, setProfilePicture] = useState(user?.profilePicture || "");

  // Form dirty check via unified useDirtyManager
  const currentFormData = useMemo(
    () => ({
      name: name.trim(),
      role,
      authorRole: authorRole.trim(),
      description: description.trim(),
      profilePicture,
      password: password.trim(),
    }),
    [name, role, authorRole, description, profilePicture, password]
  );

  const initialFormData = useMemo(
    () => ({
      name: (user?.name || "").trim(),
      role: user?.role || "EDITOR",
      authorRole: (user?.authorRole || "").trim(),
      description: (user?.description || "").trim(),
      profilePicture: user?.profilePicture || "",
      password: "",
    }),
    [user]
  );

  const dirtyManager = useDirtyManager({
    currentData: currentFormData,
    initialData: initialFormData,
    isDirtyFn: (curr, init) => {
      if (!isEdit) return true;
      return !deepEqual(curr, init);
    },
  });

  const handleGeneratePassword = () => {
    const gen = generateStrongPassword();
    setPassword(gen);
    setShowPassword(true);
    toast.add({
      title: "Password Generated",
      description: "Remember to copy and share it with the user.",
      type: "info",
    });
  };

  const handleCopyPassword = () => {
    if (!password) return;
    navigator.clipboard.writeText(password);
    setCopied(true);
    toast.add({
      title: "Copied",
      description: "Password copied to clipboard.",
      type: "success",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  // Cloudinary Direct Unsigned Upload
  const handleImageUpload = async (file: File) => {
    if (!file) return;
    setIsUploading(true);

    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
      toast.add({
        title: "Configuration Error",
        description: "Cloudinary credentials missing in environment.",
        type: "error",
      });
      setIsUploading(false);
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", uploadPreset);

    try {
      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        {
          method: "POST",
          body: formData,
        }
      );
      const data = await res.json();
      if (data.secure_url) {
        setProfilePicture(data.secure_url);
        toast.add({
          title: "Image Uploaded",
          description: "Photo ready. Click Save Changes to apply.",
          type: "success",
        });
      } else {
        throw new Error(data.error?.message || "Cloudinary upload failed");
      }
    } catch (err) {
      toast.add({
        title: "Upload Error",
        description: err instanceof Error ? err.message : "Failed to upload photo.",
        type: "error",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent redundant API call if editing and no changes were made
    if (isEdit && !dirtyManager.isDirty) {
      onClose();
      return;
    }

    setLoading(true);

    try {
      if (isEdit) {
        // Edit Mode: PATCH /api/users/[id]
        const res = await fetch(`/api/users/${user.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            role,
            authorRole: authorRole.trim(),
            description: description.trim(),
            profilePicture,
            ...(password.trim() ? { password: password.trim() } : {}),
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || "Failed to update user");
        }

        toast.add({
          title: "User Updated",
          description: `${name || user.email}'s profile was successfully updated.`,
          type: "success",
        });

        if (isCurrentUser) {
          await updateSession({
            name: name.trim(),
            image: profilePicture,
          });
        }
      } else {
        // Create Mode: POST /api/users
        const res = await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            email: email.trim(),
            password,
            role,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || "Failed to create user");
        }

        toast.add({
          title: "Success",
          description: "User created successfully.",
          type: "success",
        });
      }

      onSuccess();
      onClose();
    } catch (err) {
      toast.add({
        title: isEdit ? "Update Error" : "Creation Error",
        description: err instanceof Error ? err.message : "An unexpected error occurred.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  // Render dedicated 2-column layout for Edit Mode with generous spacing & matching equal-height cards
  if (isEdit) {
    return (
      <form onSubmit={handleSubmit} className="space-y-6 pt-2">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
          {/* CARD 1: Identity & Role */}
          <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 flex flex-col justify-between space-y-4 shadow-2xs">
            {/* Upper Section: Avatar & Info Inputs */}
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                {/* Avatar with Camera Trigger */}
                <div className="relative group shrink-0">
                  <div className="size-18 rounded-full overflow-hidden bg-muted border-2 border-primary/25 flex items-center justify-center relative shadow-sm ring-2 ring-primary/10">
                    {profilePicture ? (
                      <Image
                        src={profilePicture}
                        alt={name || "User Avatar"}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <UserIcon className="size-8 text-muted-foreground" />
                    )}

                    {isUploading && (
                      <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10 backdrop-blur-xs">
                        <Loader2 className="size-5 animate-spin text-primary" />
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading || loading}
                    className="absolute -bottom-1 -right-1 p-1.5 bg-primary text-primary-foreground rounded-full hover:scale-110 active:scale-95 transition-all shadow-md cursor-pointer disabled:opacity-50"
                    title="Upload photo"
                  >
                    <Camera className="size-3.5" />
                  </button>

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload(file);
                    }}
                    accept="image/*"
                    className="hidden"
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-base text-foreground truncate">
                      {name || "Unnamed User"}
                    </h4>
                    <Badge variant={role === "ADMIN" ? "default" : "secondary"} className="text-xs font-semibold py-0.5 px-2">
                      {role === "ADMIN" ? "Admin" : "Editor"}
                    </Badge>
                  </div>
                  <p className="flex items-center gap-1.5 mt-1 text-sm text-muted-foreground">
                    <Mail className="size-3.5 shrink-0" />
                    <span className="truncate">{user?.email}</span>
                  </p>
                </div>
              </div>

              {/* Full Name */}
              <div className="space-y-1.5 pt-1">
                <Label htmlFor="edit-name" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Full Name
                </Label>
                <Input
                  id="edit-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Full name"
                  disabled={loading}
                  required
                  className="h-10 text-sm bg-background/50 focus:bg-background transition-colors"
                />
              </div>

              {/* Email Address (Read-only) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="edit-email" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Email Address
                  </Label>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Lock className="size-3" /> Read-only
                  </span>
                </div>
                  <Input
                    id="edit-email"
                    value={user?.email || ""}
                    disabled
                  className="h-10 text-sm bg-muted/50 text-muted-foreground cursor-not-allowed border-dashed"
                  />
              </div>
            </div>

            {/* Lower Section: Account Role Selector Cards */}
            <div className="space-y-2.5 pt-3 border-t border-border/60">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Account Role & Permissions
                </Label>
                {isCurrentUser && (
                  <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                    Cannot change own role
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                {/* Admin Card */}
                <label
                  className={cn(
                    "relative flex flex-col p-3 rounded-xl border cursor-pointer transition-all select-none",
                    role === "ADMIN"
                      ? "border-primary bg-primary/5 ring-1 ring-primary shadow-xs"
                      : "border-border/60 hover:border-primary/40 bg-muted/20",
                    isCurrentUser && "cursor-not-allowed opacity-65"
                  )}
                >
                  <input
                    type="radio"
                    name="edit-role"
                    value="ADMIN"
                    checked={role === "ADMIN"}
                    onChange={() => !isCurrentUser && setRole("ADMIN")}
                    disabled={isCurrentUser || loading}
                    className="sr-only"
                  />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className={cn("size-4", role === "ADMIN" ? "text-primary" : "text-muted-foreground")} />
                      <span className={cn("text-sm font-bold", role === "ADMIN" ? "text-primary" : "text-foreground")}>
                        Admin
                      </span>
                    </div>
                    {role === "ADMIN" && <div className="size-2 rounded-full bg-primary" />}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 leading-snug">
                    Full system access
                  </p>
                </label>

                {/* Editor Card */}
                <label
                  className={cn(
                    "relative flex flex-col p-3 rounded-xl border cursor-pointer transition-all select-none",
                    role === "EDITOR"
                      ? "border-primary bg-primary/5 ring-1 ring-primary shadow-xs"
                      : "border-border/60 hover:border-primary/40 bg-muted/20",
                    isCurrentUser && "cursor-not-allowed opacity-65"
                  )}
                >
                  <input
                    type="radio"
                    name="edit-role"
                    value="EDITOR"
                    checked={role === "EDITOR"}
                    onChange={() => !isCurrentUser && setRole("EDITOR")}
                    disabled={isCurrentUser || loading}
                    className="sr-only"
                  />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <PenTool className={cn("size-4", role === "EDITOR" ? "text-primary" : "text-muted-foreground")} />
                      <span className={cn("text-sm font-bold", role === "EDITOR" ? "text-primary" : "text-foreground")}>
                        Editor
                      </span>
                    </div>
                    {role === "EDITOR" && <div className="size-2 rounded-full bg-primary" />}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 leading-snug">
                    Create & manage content
                  </p>
                </label>
              </div>
            </div>
          </div>

          {/* CARD 2: Password & Public Author Attribution */}
          <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 flex flex-col justify-between space-y-4 shadow-2xs">
            {/* Upper Section: Set New Password */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <KeyRound className="size-4 text-primary" />
                  <Label htmlFor="edit-password" className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Set New Password
                  </Label>
                </div>
                <button
                  type="button"
                  onClick={handleGeneratePassword}
                  className="text-xs text-primary hover:underline flex items-center gap-1 cursor-pointer font-semibold"
                >
                  <Sparkles className="size-3.5" />
                  <span>Generate Strong</span>
                </button>
              </div>

              <div className="relative">
                <Input
                  id="edit-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Leave blank to keep current"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="pr-16 h-10 text-sm font-mono tracking-wider bg-background/50 focus:bg-background"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-2 gap-0.5">
                  {password && (
                    <button
                        type="button"
                      className="p-1 text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                        onClick={handleCopyPassword}
                      title="Copy password"
                      >
                        {copied ? <Check className="size-4 text-emerald-500" /> : <Copy className="size-4" />}
                    </button>
                  )}
                  <button
                    type="button"
                    className="p-1 text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={loading}
                    tabIndex={-1}
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>
             
            </div>

            {/* Lower Section: Public Author Attribution */}
            <div className="space-y-3 pt-3 border-t border-border/60 flex-1 flex flex-col justify-between">
              <div className="flex items-center gap-2 pb-1">
                <PenTool className="size-4 text-primary" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Public Author Attribution
                </h4>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-author-role" className="text-xs font-semibold text-muted-foreground">
                  Author Title / Role
                </Label>
                <Input
                  id="edit-author-role"
                  value={authorRole}
                  onChange={(e) => setAuthorRole(e.target.value)}
                  placeholder="e.g. Senior Tech Writer, Head of Design"
                  disabled={loading}
                  className="h-10 text-sm bg-background/50 focus:bg-background"
                />
              </div>

              <div className="space-y-1.5 flex-1 flex flex-col">
                <Label htmlFor="edit-description" className="text-xs font-semibold text-muted-foreground">
                  Author Bio
                </Label>
                <Textarea
                  id="edit-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Short bio displayed on author cards on blog posts..."
                  rows={3}
                  disabled={loading}
                  className="flex-1 min-h-[96px] resize-none text-sm bg-background/50 focus:bg-background leading-relaxed"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-border/70">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading || isUploading}
            className="h-10 px-5 text-sm cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading || isUploading || (isEdit && !dirtyManager.isDirty)}
            className="h-10 px-6 text-sm font-semibold shadow-xs hover:shadow-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading && <Loader2 className="size-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </form>
    );
  }

  // Render Create User Form (kept exactly as tested and approved)
  return (
    <form onSubmit={handleSubmit} className="space-y-6 pt-2">
      {/* Profile Identity Card (Top Section) */}
      <div className="rounded-xl border border-border/80 bg-muted/40 p-4 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          {/* Avatar with Camera Trigger */}
          <div className="relative group shrink-0">
            <div className="size-20 rounded-full overflow-hidden bg-card border-2 border-primary/20 flex items-center justify-center relative shadow-md ring-2 ring-primary/10">
              {profilePicture ? (
                <Image
                  src={profilePicture}
                  alt={name || "User Avatar"}
                  fill
                  className="object-cover"
                />
              ) : (
                <UserIcon className="size-9 text-muted-foreground" />
              )}

              {isUploading && (
                <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10 backdrop-blur-xs">
                  <Loader2 className="size-5 animate-spin text-primary" />
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || loading}
              className="absolute -bottom-1 -right-1 p-1.5 bg-primary text-primary-foreground rounded-full hover:scale-105 active:scale-95 transition-all shadow-md cursor-pointer disabled:opacity-50"
              title="Upload photo"
            >
              <Camera className="size-3.5" />
            </button>

            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImageUpload(file);
              }}
              accept="image/*"
              className="hidden"
            />
          </div>

          {/* User Meta Preview */}
          <div className="flex-1 text-center sm:text-left min-w-0">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h3 className="font-bold text-base text-foreground truncate">
                {name || "New Team Member"}
              </h3>
              <Badge variant={role === "ADMIN" ? "default" : "secondary"} className="text-[11px] font-semibold">
                {role === "ADMIN" ? "Administrator" : "Editor"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1 truncate flex items-center justify-center sm:justify-start gap-1">
              <Mail className="size-3" />
              <span>{email || "Enter email below"}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Account Info: 2 Columns on Desktop */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Full Name */}
        <div className="space-y-1.5">
          <Label htmlFor="user-name" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Full Name
          </Label>
          <Input
            id="user-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter full name"
            disabled={loading}
            required
            className="h-10 text-sm bg-background/50 focus:bg-background transition-colors"
          />
        </div>

        {/* Email Address */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="user-email" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Email Address
            </Label>
          </div>
          <Input
            id="user-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@ysinnovations.com"
            required
            disabled={loading}
            className="h-10 text-sm bg-background/50 focus:bg-background transition-colors"
          />
        </div>
      </div>

      {/* Account Role Selector Cards */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Account Role & Permissions
          </Label>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Admin Card */}
          <label
            className={cn(
              "relative flex flex-col p-3.5 rounded-xl border cursor-pointer transition-all select-none",
              role === "ADMIN"
                ? "border-primary bg-primary/5 ring-1 ring-primary shadow-xs"
                : "border-border/60 hover:border-primary/40 bg-card"
            )}
          >
            <input
              type="radio"
              name="modal-role"
              value="ADMIN"
              checked={role === "ADMIN"}
              onChange={() => setRole("ADMIN")}
              disabled={loading}
              className="sr-only"
            />
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-2">
                <ShieldCheck className={cn("size-4", role === "ADMIN" ? "text-primary" : "text-muted-foreground")} />
                <span className={cn("text-sm font-bold", role === "ADMIN" ? "text-primary" : "text-foreground")}>
                  Administrator
                </span>
              </div>
              {role === "ADMIN" && (
                <div className="size-2 rounded-full bg-primary" />
              )}
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Full control over all pages, users and media.
            </p>
          </label>

          {/* Editor Card */}
          <label
            className={cn(
              "relative flex flex-col p-3.5 rounded-xl border cursor-pointer transition-all select-none",
              role === "EDITOR"
                ? "border-primary bg-primary/5 ring-1 ring-primary shadow-xs"
                : "border-border/60 hover:border-primary/40 bg-card"
            )}
          >
            <input
              type="radio"
              name="modal-role"
              value="EDITOR"
              checked={role === "EDITOR"}
              onChange={() => setRole("EDITOR")}
              disabled={loading}
              className="sr-only"
            />
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-2">
                <PenTool className={cn("size-4", role === "EDITOR" ? "text-primary" : "text-muted-foreground")} />
                <span className={cn("text-sm font-bold", role === "EDITOR" ? "text-primary" : "text-foreground")}>
                  Editor
                </span>
              </div>
              {role === "EDITOR" && (
                <div className="size-2 rounded-full bg-primary" />
              )}
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Can create, write, and manage blogs and pages.
            </p>
          </label>
        </div>
      </div>

      {/* Security & Password Card */}
      <div className="rounded-xl border border-border/80 bg-card p-4 space-y-3 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <KeyRound className="size-4 text-primary" />
            <Label htmlFor="user-password" className="text-xs font-bold uppercase tracking-wider text-foreground">
              Account Password
            </Label>
          </div>
          <button
            type="button"
            onClick={handleGeneratePassword}
            className="text-xs text-primary hover:underline flex items-center gap-1 cursor-pointer font-semibold"
          >
            <Sparkles className="size-3" />
            <span>Generate Strong</span>
          </button>
        </div>

        <div className="relative">
          <Input
            id="user-password"
            type={showPassword ? "text" : "password"}
            required
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            className="pr-20 h-10 text-sm font-mono tracking-wider bg-background/50"
          />
          <div className="absolute inset-y-0 right-0 flex items-center pr-2 gap-1">
            {password && (
              <button
                type="button"
                className="p-1 text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                onClick={handleCopyPassword}
                title="Copy password"
              >
                {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
              </button>
            )}
            <button
              type="button"
              className="p-1 text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
              onClick={() => setShowPassword(!showPassword)}
              disabled={loading}
              tabIndex={-1}
              title={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Must be at least 8 characters long and contain both letters and numbers.
        </p>
      </div>

      {/* Footer Action Buttons */}
      <div className="flex items-center justify-end gap-3 pt-3 border-t border-border/70">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={loading || isUploading}
          className="h-10 px-5 text-sm cursor-pointer"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={loading || isUploading}
          className="h-10 px-6 text-sm font-semibold shadow-sm hover:shadow-md transition-all cursor-pointer"
        >
          {loading && <Loader2 className="size-4 mr-2 animate-spin" />}
          Create User
        </Button>
      </div>
    </form>
  );
}

export function UserModal({
  user,
  open,
  onOpenChange,
  onSuccess,
}: UserModalProps) {
  const isEdit = !!user;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "rounded-2xl border-border/80 shadow-2xl transition-all",
          isEdit
            ? "sm:max-w-[960px] p-7 sm:p-8 max-h-[94vh] overflow-y-auto"
            : "sm:max-w-[620px] p-6 max-h-[92vh] overflow-y-auto"
        )}
      >
        <DialogHeader className="pb-3 border-b border-border/60">
          <div className="flex items-center gap-3.5">
            <div className={cn(
              "rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0 shadow-xs",
              isEdit ? "size-11" : "size-10"
            )}>
              {isEdit ? <UserCog className="size-5.5" /> : <UserPlus className="size-5" />}
            </div>
            <div>
              <DialogTitle className={cn(
                "font-extrabold text-foreground tracking-tight",
                isEdit ? "text-xl" : "text-lg"
              )}>
                {isEdit ? "Edit User Profile" : "Add New User"}
              </DialogTitle>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                {isEdit
                  ? "Update credentials, permissions, and author attribution."
                  : "Invite a new admin or editor to access the CMS."}
              </p>
            </div>
          </div>
        </DialogHeader>

        {open && (
          <UserForm
            key={user ? user.id : "create-user"}
            user={user}
            onClose={() => onOpenChange(false)}
            onSuccess={onSuccess}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
