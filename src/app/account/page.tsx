"use client";

import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import {
  Calendar,
  Camera,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  PenTool,
  Save,
  Shield,
  ShieldCheck,
  User as UserIcon,
  UserCog,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toast";
import Image from "next/image";
import { format } from "date-fns";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

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

  // Password change states
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: accountData, mutate: mutateAccount } = useSWR(
    session?.user ? "/api/account" : null,
  );

  useEffect(() => {
    if (accountData) {
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
    }
  }, [accountData, session]);

  const hasChanges =
    name !== initialValues.name ||
    profilePicture !== initialValues.profilePicture ||
    description !== initialValues.description ||
    authorRole !== initialValues.authorRole;

  const handleUpload = async (file: File) => {
    if (!file) return;
    setIsUploading(true);

    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME as string;
    const uploadPreset = process.env
      .NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET as string;

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

      toast.add({
        title: "Success",
        description: "Your profile has been updated.",
        type: "success",
      });
    } catch {
      toast.add({
        title: "Error",
        description: "Failed to save profile changes.",
        type: "error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.add({
        title: "Validation Error",
        description: "Please fill in all password fields.",
        type: "error",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.add({
        title: "Validation Error",
        description: "New password and confirmation password do not match.",
        type: "error",
      });
      return;
    }

    if (
      newPassword.length < 8 ||
      !/[A-Za-z]/.test(newPassword) ||
      !/[0-9]/.test(newPassword)
    ) {
      toast.add({
        title: "Weak Password",
        description:
          "Password must be at least 8 characters long and contain both letters and numbers.",
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

      toast.add({
        title: "Password Updated",
        description: "Your password has been changed successfully.",
        type: "success",
      });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      toast.add({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to change password.",
        type: "error",
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const role = session?.user?.role || "EDITOR";

  return (
    <>
      <header className="sticky top-0 z-30 bg-background flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 border-b">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-2 data-vertical:h-4 data-vertical:self-auto h-4"
          />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage>Account Settings</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-6 p-6 w-full">
        <div>
          <h2 className="text-2xl font-extrabold text-foreground tracking-tight">
            Account Settings
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage your personal credentials, profile attributes, and security.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          <div className="lg:col-span-7 rounded-2xl border border-border/80 bg-card p-6 shadow-sm flex flex-col justify-center">
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

            {/* Vertically centered profile content */}
            <div className="flex items-center gap-5 sm:gap-6">
              {/* Avatar with Camera Trigger */}
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
                    className="object-cover"
                    priority
                  />
                ) : (
                  <div className="size-full flex items-center justify-center text-muted-foreground bg-muted">
                    <UserIcon className="size-9 opacity-60" />
                  </div>
                )}

                {/* Camera Hover Overlay */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white z-10">
                  <Camera className="size-3.5 mb-0.5" />
                  <span className="text-[8px] font-semibold uppercase tracking-wider">
                    Change
                  </span>
                </div>
              </div>

              {/* Name & Details: Vertically aligned with avatar */}
              <div className="min-w-0">
                {/* Name & User Role (Admin / Editor) */}
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
                  <p className="text-xs font-medium text-muted-foreground capitalize mt-1">
                    {authorRole}
                  </p>
                )}

                {/* Email & Member since */}
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
          </div>

          {/* Right: Live Public Author Card Preview (40%) */}
          <div className="lg:col-span-5 rounded-2xl border border-border/80 bg-card p-5 shadow-sm flex flex-col justify-between space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-border/60">
              <div className="flex items-center gap-2">
                <PenTool className="size-4 text-primary" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Author Card Preview
                </h4>
              </div>
              <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full font-medium">
                Live Preview
              </span>
            </div>

            {/* Rendered Mock Author Box */}
            <div className="rounded-xl border border-border/60 bg-muted/30 p-4 space-y-2.5 flex-1 flex flex-col justify-center">
              <div className="flex items-center gap-3">
                <div className="relative size-12 rounded-full overflow-hidden bg-muted border border-border shrink-0">
                  {profilePicture ? (
                    <Image
                      src={profilePicture}
                      alt="Author Avatar"
                      fill
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
              <p className="text-xs text-muted-foreground italic leading-relaxed line-clamp-3">
                &ldquo;
                {description ||
                  "Your author bio will be displayed here on blog articles..."}
                &rdquo;
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Section: Profile Information (50%) & Security & Password (50%) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          {/* Panel 1: Profile Information (50%) */}
          <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm flex flex-col justify-between space-y-5">
            <div className="space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-border/60">
                <div className="flex items-center gap-2.5">
                  <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <UserCog className="size-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-foreground tracking-tight">
                      Profile Information
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Update your public display name and author attribution.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
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

                {/* Author Role */}
                <div className="space-y-1.5">
                  <Label
                    htmlFor="authorRole"
                    className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
                  >
                    Author Title / Role
                  </Label>
                  <Input
                    id="authorRole"
                    value={authorRole}
                    onChange={(e) => setAuthorRole(e.target.value)}
                    className="h-10 text-sm bg-background/50"
                    placeholder="e.g. Senior Tech Writer, Head of Design"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Shown directly under your name on blog posts authored by
                    you.
                  </p>
                </div>

                {/* Author Bio */}
                <div className="space-y-1.5">
                  <Label
                    htmlFor="description"
                    className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
                  >
                    Author Bio
                  </Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="text-sm min-h-24 resize-y bg-background/50 leading-relaxed"
                    placeholder="Write a short bio about yourself for blog readers..."
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Displayed in the author card at the bottom of published blog
                    posts.
                  </p>
                </div>
              </div>
            </div>

            {/* Save Changes Button */}
            <div className="pt-4 border-t border-border/60 flex justify-end">
              <Button
                onClick={handleSave}
                disabled={isSaving || isUploading || !hasChanges}
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

          {/* Panel 2: Security & Password (50%) */}
          <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm flex flex-col justify-between space-y-5">
            <div className="space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-border/60">
                <div className="flex items-center gap-2.5">
                  <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <ShieldCheck className="size-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-foreground tracking-tight">
                      Security & Password
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Ensure your account is protected with a strong, private
                      password.
                    </p>
                  </div>
                </div>
              </div>

              <form
                id="password-form"
                onSubmit={handleChangePassword}
                className="space-y-4"
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
                      placeholder="Enter your current password"
                      required
                      disabled={isChangingPassword}
                      className="pr-10 text-sm h-10 bg-background/50 font-mono tracking-wider"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                      onClick={() =>
                        setShowCurrentPassword(!showCurrentPassword)
                      }
                      disabled={isChangingPassword}
                    >
                      {showCurrentPassword ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* New Password */}
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
                        placeholder="••••••••"
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
                      >
                        {showNewPassword ? (
                          <EyeOff className="size-4" />
                        ) : (
                          <Eye className="size-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Confirm New Password */}
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
                        placeholder="••••••••"
                        required
                        disabled={isChangingPassword}
                        className="pr-10 text-sm h-10 bg-background/50 font-mono tracking-wider"
                      />
                      <button
                        type="button"
                        tabIndex={-1}
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                        onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                        disabled={isChangingPassword}
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

                <p className="text-[11px] text-muted-foreground">
                  Minimum 8 characters with at least one letter and one number.
                </p>
              </form>
            </div>

            {/* Update Password Button */}
            <div className="pt-4 border-t border-border/60 flex justify-end">
              <Button
                form="password-form"
                type="submit"
                disabled={
                  isChangingPassword ||
                  !currentPassword ||
                  !newPassword ||
                  !confirmPassword
                }
                className="h-10 px-6 text-sm font-semibold shadow-xs hover:shadow-md transition-all cursor-pointer"
              >
                {isChangingPassword ? (
                  <>
                    <Loader2 className="size-4 mr-2 animate-spin" /> Updating...
                  </>
                ) : (
                  <>
                    <KeyRound className="size-4 mr-2" /> Update Password
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
