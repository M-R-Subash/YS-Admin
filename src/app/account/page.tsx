"use client";

import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import {
  Calendar,
  Camera,
  CheckCircle2,
  HelpCircle,
  Info,
  Loader2,
  Lock,
  Mail,
  PenTool,
  Save,
  Shield,
  Sparkles,
  User as UserIcon,
  UserCog,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toast";
import { useDirtyManager } from "@/hooks/useDirtyManager";
import Image from "next/image";
import { format } from "date-fns";
import { AdminTopBar } from "@/components/layout/AdminTopBar";
import { clientConfig } from "@/lib/config/client";

export default function AccountPage() {
  const { data: session, update } = useSession();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [profilePicture, setProfilePicture] = useState("");
  const [description, setDescription] = useState("");
  const [authorRole, setAuthorRole] = useState("");
  const [createdAt, setCreatedAt] = useState<string | null>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [initialValues, setInitialValues] = useState({
    name: "",
    profilePicture: "",
    description: "",
    authorRole: "",
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: accountData, mutate: mutateAccount } = useSWR(
    session?.user ? "/api/account" : null,
  );

  useEffect(() => {
    if (accountData) {
      /* eslint-disable react-hooks/set-state-in-effect */
      setName(accountData.name || session?.user?.name || "");
      setEmail(accountData.email || session?.user?.email || "");
      setProfilePicture(
        accountData.profilePicture || session?.user?.image || "",
      );
      setDescription(accountData.description || "");
      setAuthorRole(accountData.authorRole || "");
      if (accountData.createdAt) setCreatedAt(accountData.createdAt);
      setInitialValues({
        name: accountData.name || session?.user?.name || "",
        profilePicture:
          accountData.profilePicture || session?.user?.image || "",
        description: accountData.description || "",
        authorRole: accountData.authorRole || "",
      });
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [accountData, session]);

  const currentProfileData = {
    name: name.trim(),
    profilePicture,
    description: description.trim(),
    authorRole: authorRole.trim(),
  };

  const initialProfileData = {
    name: (initialValues.name || "").trim(),
    profilePicture: initialValues.profilePicture || "",
    description: (initialValues.description || "").trim(),
    authorRole: (initialValues.authorRole || "").trim(),
  };

  const dirtyManager = useDirtyManager({
    currentData: currentProfileData,
    initialData: initialProfileData,
    protectWindowClose: true,
  });

  const handleUpload = async (file: File) => {
    if (!file) return;
    setIsUploading(true);

    const cloudName = clientConfig.cloudinary.cloudName;
    const uploadPreset = clientConfig.cloudinary.uploadPreset;

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
        },
      );
      const data = await res.json();
      if (data.secure_url) {
        setProfilePicture(data.secure_url);
        toast.add({
          title: "Image Uploaded",
          description: "Click 'Save Changes' to update your account.",
          type: "success",
        });
      } else {
        throw new Error(data.error?.message || "Cloudinary upload failed");
      }
    } catch (err) {
      toast.add({
        title: "Upload Error",
        description:
          err instanceof Error ? err.message : "Failed to upload image.",
        type: "error",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/account", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, profilePicture, description, authorRole }),
      });

      if (!res.ok) throw new Error("Failed to update account");

      await update({
        name,
        image: profilePicture,
      });

      await mutateAccount();

      setInitialValues({ name, profilePicture, description, authorRole });
      dirtyManager.markClean(currentProfileData);

      toast.add({
        title: "Profile Updated",
        description: "Your changes have been saved successfully.",
        type: "success",
      });
    } catch {
      toast.add({
        title: "Save Failed",
        description: "Failed to save profile changes. Please try again.",
        type: "error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const role = session?.user?.role || "EDITOR";

  return (
    <>
      <AdminTopBar breadcrumbs="Account Settings" />

      <div className="flex flex-1 flex-col gap-6 py-6 px-3.75 md:px-5 lg:px-7.5 w-full max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2.5">
            <h2 className="text-2xl font-extrabold text-foreground tracking-tight">
              Account Settings
            </h2>
            <Badge
              variant="outline"
              className="text-[11px] font-semibold text-muted-foreground border-border/80"
            >
              Personal Preferences
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Manage your personal credentials, editorial persona, and public attribution.
          </p>
        </div>

        {/* Profile Identity Card Banner */}
        <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-xs relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-full bg-linear-to-l from-primary/5 to-transparent pointer-events-none" />

          <input
            type="file"
            accept="image/*"
            className="hidden"
            ref={fileInputRef}
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleUpload(e.target.files[0]);
              }
            }}
          />

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
            <div className="flex items-center gap-5">
              {/* Avatar with Camera Overlay */}
              <div
                className="group relative size-20 sm:size-22 rounded-full overflow-hidden border-2 border-primary/20 bg-muted shadow-md cursor-pointer transition-all hover:ring-2 hover:ring-primary/40 shrink-0"
                onClick={() => !isUploading && fileInputRef.current?.click()}
                title="Click to change profile picture"
              >
                {isUploading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-20 backdrop-blur-xs">
                    <Loader2 className="size-5 text-white animate-spin" />
                  </div>
                )}

                {profilePicture ? (
                  <Image
                    src={profilePicture}
                    alt={name || "Profile"}
                    fill
                    sizes="88px"
                    className="object-cover"
                    priority
                  />
                ) : (
                  <div className="size-full flex items-center justify-center text-muted-foreground bg-muted">
                    <UserIcon className="size-9 opacity-60" />
                  </div>
                )}

                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white z-10">
                  <Camera className="size-4 mb-0.5" />
                  <span className="text-[9px] font-semibold uppercase tracking-wider">
                    Change
                  </span>
                </div>
              </div>

              {/* User Identity Details */}
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h3 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
                    {name || "User Profile"}
                  </h3>
                  {role === "ADMIN" ? (
                    <Badge
                      variant="outline"
                      className="relative overflow-hidden bg-black text-white border-zinc-800 shadow-sm font-semibold text-xs py-0.5 px-2.5 rounded-full inline-flex items-center gap-1 select-none"
                    >
                      <Shield className="size-3 text-zinc-300 relative z-10" />
                      <span className="relative z-10">Admin</span>
                      <span
                        aria-hidden="true"
                        className="absolute inset-0 -translate-x-full animate-badge-shine bg-linear-to-r from-transparent via-white/35 to-transparent pointer-events-none"
                      />
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="bg-primary/10 text-primary border-primary/20 font-semibold text-xs py-0.5 px-2.5 rounded-full"
                    >
                      <Shield className="size-3 mr-1" />
                      Editor
                    </Badge>
                  )}
                </div>

                {authorRole && (
                  <p className="text-xs font-semibold text-primary mt-1">
                    {authorRole}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mt-1.5">
                  <p className="flex items-center gap-1.5">
                    <Mail className="size-3.5 text-muted-foreground shrink-0" />
                    <span>{email || session?.user?.email}</span>
                  </p>
                  {createdAt && (
                    <>
                      <span className="text-muted-foreground/40">&bull;</span>
                      <p className="flex items-center gap-1.5">
                        <Calendar className="size-3.5 text-muted-foreground shrink-0" />
                        <span>
                          Member since{" "}
                          {format(new Date(createdAt), "MMM d, yyyy")}
                        </span>
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Status Pill */}
            <div className="hidden md:flex flex-col items-end gap-1.5 text-right">
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Active Account
              </span>
              <p className="text-[11px] text-muted-foreground">
                Click your avatar to upload a new photo
              </p>
            </div>
          </div>
        </div>

        {/* Profile Editor & Public Author Attribution Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Form Editor (7 cols) */}
          <div className="lg:col-span-7 rounded-2xl border border-border/80 bg-card p-6 shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <div className="flex items-center gap-2.5">
                <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <UserCog className="size-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground tracking-tight">
                    Editorial Profile
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Customize your public author details across published posts.
                  </p>
                </div>
              </div>

              {dirtyManager.isDirty && (
                <Badge
                  variant="outline"
                  className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-[11px]"
                >
                  Unsaved Changes
                </Badge>
              )}
            </div>

            <div className="space-y-4.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Display Name */}
                <div className="space-y-1.5">
                  <Label
                    htmlFor="name"
                    className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
                  >
                    Display Name
                  </Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-10 text-sm bg-background/50"
                    placeholder="Enter your full name"
                  />
                </div>

                {/* Email Address */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label
                      htmlFor="email"
                      className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
                    >
                      Email Address
                    </Label>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Lock className="size-2.5" /> Read-only
                    </span>
                  </div>
                  <Input
                    id="email"
                    value={email}
                    disabled
                    className="h-10 text-sm bg-muted/60 text-muted-foreground cursor-not-allowed border-dashed"
                  />
                </div>
              </div>

              {/* Author Title / Role */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="authorRole"
                    className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
                  >
                    Author Title / Role
                  </Label>
                  <span className="text-[11px] text-muted-foreground">
                    e.g. Lead Developer, Content Strategist
                  </span>
                </div>
                <Input
                  id="authorRole"
                  value={authorRole}
                  onChange={(e) => setAuthorRole(e.target.value)}
                  className="h-10 text-sm bg-background/50"
                  placeholder="e.g. Senior Tech Writer, Head of Design"
                />
                <p className="text-[11px] text-muted-foreground">
                  Shown directly under your name on blog articles you author.
                </p>
              </div>

              {/* Author Bio */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="description"
                    className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
                  >
                    Author Bio
                  </Label>
                  <span className="text-[11px] text-muted-foreground font-mono">
                    {description.length}/350
                  </span>
                </div>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={350}
                  className="text-sm min-h-28 resize-y bg-background/50 leading-relaxed"
                  placeholder="Write a concise bio summarizing your expertise for readers..."
                />
                <p className="text-[11px] text-muted-foreground">
                  Rendered in the author byline box at the bottom of published articles.
                </p>
              </div>
            </div>

            {/* Save Action Bar */}
            <div className="pt-4 border-t border-border/60 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Info className="size-3.5" />
                <span>Changes reflect immediately on published blogs.</span>
              </div>

              <Button
                onClick={handleSave}
                disabled={isSaving || isUploading || !dirtyManager.isDirty}
                className="h-10 px-6 text-sm font-semibold shadow-xs hover:shadow-md transition-all cursor-pointer"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="size-4 mr-2 animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <Save className="size-4 mr-2" /> Save Changes
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Right Column: Live Author Byline Preview (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <PenTool className="size-4 text-primary" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Live Author Byline Preview
                  </h4>
                </div>
                <Badge
                  variant="outline"
                  className="text-[10px] bg-primary/10 text-primary border-primary/20 font-medium px-2 py-0.5 rounded-full inline-flex items-center gap-1"
                >
                  <Sparkles className="size-2.5" />
                  Live Preview
                </Badge>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">
                This shows exactly how your profile renders in the author box at the footer of blogs you publish.
              </p>

              {/* Realistic Mock Author Box */}
              <div className="rounded-xl border border-border/80 bg-muted/40 p-4 sm:p-5 space-y-3 relative overflow-hidden transition-all">
                <div className="flex items-center gap-3.5">
                  <div className="relative size-12 rounded-full overflow-hidden bg-muted border border-border/80 shadow-xs shrink-0">
                    {profilePicture ? (
                      <Image
                        src={profilePicture}
                        alt="Author Avatar"
                        fill
                        sizes="48px"
                        className="object-cover"
                      />
                    ) : (
                      <UserIcon className="size-6 text-muted-foreground m-auto" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h5 className="font-bold text-sm text-foreground truncate">
                      {name || "Your Full Name"}
                    </h5>
                    <p className="text-xs text-primary font-medium truncate">
                      {authorRole || "Author Role / Title"}
                    </p>
                  </div>
                </div>

                <div className="border-t border-border/40 pt-2.5">
                  <p className="text-xs text-muted-foreground italic leading-relaxed">
                    &ldquo;
                    {description ||
                      "Your author bio will be displayed here on blog articles. Keep it engaging and informative for readers."}
                    &rdquo;
                  </p>
                </div>
              </div>

              {/* Attribution Notes */}
              <div className="rounded-lg bg-muted/30 border border-border/50 p-3 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  <CheckCircle2 className="size-3.5 text-emerald-600" />
                  <span>SEO Schema Compatibility</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Your author name and role are automatically injected into JSON-LD structured data for Google Search article rich snippets.
                </p>
              </div>
            </div>

            {/* Help / Guide Box */}
            <div className="rounded-xl border border-dashed border-border/80 p-4 text-xs text-muted-foreground flex items-start gap-2.5">
              <HelpCircle className="size-4 shrink-0 text-primary mt-0.5" />
              <div className="space-y-1">
                <p className="font-medium text-foreground">Need to change your login password?</p>
                <p>
                  Password credentials and security settings have been moved to the dedicated{" "}
                  <a href="/account/security" className="text-primary hover:underline font-semibold">
                    Security & Password
                  </a>{" "}
                  page.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
