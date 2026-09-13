"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { Camera, Eye, EyeOff, Loader2, User as UserIcon } from "lucide-react";
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

function UserForm({ user, onClose, onSuccess }: UserFormProps) {
  const { data: session, update: updateSession } = useSession();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEdit = !!user;
  const isCurrentUser = isEdit && session?.user?.id === user.id;

  const [loading, setLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Form states initialized directly from props (no useEffect needed)
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"ADMIN" | "EDITOR">(user?.role || "EDITOR");
  const [authorRole, setAuthorRole] = useState(user?.authorRole || "");
  const [description, setDescription] = useState(user?.description || "");
  const [profilePicture, setProfilePicture] = useState(user?.profilePicture || "");

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
          description: "Photo ready. Click Save to apply changes.",
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

  return (
    <form onSubmit={handleSubmit} className="space-y-5 pt-1">
      {/* Profile Picture Upload Section (Only in Edit Mode) */}
      {isEdit && (
        <div className="flex flex-col items-center justify-center gap-2">
          <div className="relative group">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-muted border-2 border-border flex items-center justify-center relative shadow-sm">
              {profilePicture ? (
                <Image
                  src={profilePicture}
                  alt={name || "User Avatar"}
                  fill
                  className="object-cover"
                />
              ) : (
                <UserIcon className="w-10 h-10 text-muted-foreground" />
              )}

              {isUploading && (
                <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || loading}
              className="absolute bottom-0 right-0 p-2 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors shadow-md disabled:opacity-50 cursor-pointer"
              title="Change profile picture"
            >
              <Camera className="w-4 h-4" />
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
          <p className="text-xs text-muted-foreground">
            Click the camera icon to upload a photo
          </p>
        </div>
      )}

      {/* Name Field */}
      <div className="space-y-1.5">
        <Label htmlFor="user-name" className="text-sm font-semibold">
          Full Name
        </Label>
        <Input
          id="user-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Jane Doe"
          disabled={loading}
          required={isEdit}
          className="text-sm"
        />
      </div>

      {/* Email Field */}
      <div className="space-y-1.5">
        <Label htmlFor="user-email" className="text-sm font-semibold">
          Email Address {isEdit && <span className="text-xs font-normal text-muted-foreground">(Unchangeable)</span>}
        </Label>
        <Input
          id="user-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="jane@example.com"
          required
          disabled={isEdit || loading}
          className={cn("text-sm", isEdit && "bg-muted/50 text-muted-foreground cursor-not-allowed")}
        />
      </div>

      {/* Password Field (Only in Add Mode) */}
      {!isEdit && (
        <div className="space-y-1.5">
          <Label htmlFor="user-password" className="text-sm font-semibold">
            Password
          </Label>
          <div className="relative">
            <Input
              id="user-password"
              type={showPassword ? "text" : "password"}
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              className="pr-10 text-sm"
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground cursor-pointer"
              onClick={() => setShowPassword(!showPassword)}
              disabled={loading}
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
      )}

      {/* Role Selection */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold">Account Role</Label>
          {isCurrentUser && (
            <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
              Your own role cannot be changed
            </span>
          )}
        </div>
        <div className="flex gap-3">
          {(["ADMIN", "EDITOR"] as const).map((r) => (
            <label
              key={r}
              className={cn(
                "flex-1 cursor-pointer rounded-md border-2 p-3 text-center transition-all select-none text-sm",
                role === r
                  ? "border-primary bg-primary/10 text-primary font-semibold"
                  : "border-muted-foreground/20 hover:border-primary/50 text-muted-foreground",
                isCurrentUser && "cursor-not-allowed opacity-60"
              )}
            >
              <input
                type="radio"
                name="modal-role"
                value={r}
                checked={role === r}
                onChange={() => !isCurrentUser && setRole(r)}
                disabled={isCurrentUser || loading}
                className="sr-only"
              />
              {r === "ADMIN" ? "Administrator" : "Editor"}
            </label>
          ))}
        </div>
      </div>

      {/* Author Role & Bio (Only in Edit Mode) */}
      {isEdit && (
        <>
          <div className="space-y-1.5">
            <Label htmlFor="user-author-role" className="text-sm font-semibold">
              Author Title / Role
            </Label>
            <Input
              id="user-author-role"
              value={authorRole}
              onChange={(e) => setAuthorRole(e.target.value)}
              placeholder="e.g. Senior Tech Writer, Head of Design"
              disabled={loading}
              className="text-sm"
            />
            <p className="text-[11px] text-muted-foreground">
              Displayed on blog posts authored by this user.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="user-description" className="text-sm font-semibold">
              Author Bio
            </Label>
            <Textarea
              id="user-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short bio displayed on author cards..."
              rows={3}
              disabled={loading}
              className="resize-none text-sm"
            />
          </div>
        </>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-3 pt-3 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={loading || isUploading}
          className="cursor-pointer"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={loading || isUploading}
          className="cursor-pointer"
        >
          {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {isEdit ? "Save Changes" : "Create User"}
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
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {isEdit ? "Edit User" : "Add New User"}
          </DialogTitle>
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
