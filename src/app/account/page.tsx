"use client";

import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { Camera, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import Image from "next/image";
import { User as UserIcon } from "lucide-react";
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
  
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [initialValues, setInitialValues] = useState({ name: "", profilePicture: "", description: "", authorRole: "" });
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (session?.user) {
      setName(session.user.name || "");
      setEmail(session.user.email || "");
      setProfilePicture(session.user.image || "");
      
      // Fetch full profile data including description and authorRole
      fetch("/api/account")
        .then((res) => res.json())
        .then((data) => {
          if (data) {
            setDescription(data.description || "");
            setAuthorRole(data.authorRole || "");
            setInitialValues({
              name: data.name || "",
              profilePicture: data.profilePicture || "",
              description: data.description || "",
              authorRole: data.authorRole || "",
            });
          }
        })
        .catch(() => {});
    }
  }, [session]);

  const hasChanges = name !== initialValues.name || profilePicture !== initialValues.profilePicture || description !== initialValues.description || authorRole !== initialValues.authorRole;

  const handleUpload = async (file: File) => {
    if (!file) return;
    setIsUploading(true);
    
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME as string;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET as string;

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
          description: "Don't forget to save your changes.",
          type: "success",
        });
      } else {
        throw new Error(data.error?.message || "Cloudinary upload failed");
      }
    } catch (err: any) {
      toast.add({
        title: "Upload Error",
        description: err.message || "Failed to upload image.",
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

      // Update the local session so the sidebar reflects changes immediately
      await update({
        name,
        image: profilePicture,
      });

      setInitialValues({ name, profilePicture, description, authorRole });

      toast.add({
        title: "Success",
        description: "Your profile has been updated.",
        type: "success",
      });
    } catch (error) {
      toast.add({
        title: "Error",
        description: "Failed to save profile changes.",
        type: "error",
      });
    } finally {
      setIsSaving(false);
    }
  };

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

      <div className="flex flex-1 flex-col gap-6 p-6 max-w-4xl w-full">
        <div>
          <h2 className="text-2xl font-extrabold text-foreground tracking-tight">
            Account Settings
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage your personal profile and preferences.
          </p>
        </div>

        <div className="bg-card border border-border rounded-lg p-6 flex flex-col md:flex-row gap-10 shadow-sm mt-4">
          {/* Avatar Upload Section */}
          <div className="flex flex-col items-center gap-4">
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
            
            <div 
              className="group relative w-40 h-40 rounded-full overflow-hidden border-4 border-muted cursor-pointer transition-all hover:border-primary/50"
              onClick={() => !isUploading && fileInputRef.current?.click()}
            >
              {isUploading ? (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-20">
                  <Loader2 className="w-8 h-8 text-white animate-spin" />
                </div>
              ) : null}
              
              {profilePicture ? (
                <Image 
                  src={profilePicture} 
                  alt="Profile" 
                  fill 
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground">
                  <UserIcon className="w-16 h-16 opacity-50" />
                </div>
              )}
              
              {/* Hover Overlay */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white z-10">
                <Camera className="w-6 h-6 mb-2" />
                <span className="text-sm font-medium">Change Photo</span>
              </div>
            </div>
            
            <div className="text-center">
              <h3 className="font-semibold text-lg">{name || "User"}</h3>
              <p className="text-sm text-muted-foreground">{session?.user?.role}</p>
            </div>
          </div>

          {/* Form Section */}
          <div className="flex-1 space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-semibold">
                Display Name
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-12 text-base max-w-md"
                placeholder="Enter your full name"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-semibold text-muted-foreground">
                Email Address (Unchangeable)
              </Label>
              <Input
                id="email"
                value={email}
                disabled
                className="h-12 text-base max-w-md bg-muted cursor-not-allowed opacity-70"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Your email is used for authentication and cannot be changed here.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="authorRole" className="text-sm font-semibold">
                Author Role / Title
              </Label>
              <Input
                id="authorRole"
                value={authorRole}
                onChange={(e) => setAuthorRole(e.target.value)}
                className="h-12 text-base max-w-md"
                placeholder="e.g. SEO Specialist, Content Writer"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Shown below your name on blog posts.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-semibold">
                Author Bio
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="text-base max-w-md min-h-24 resize-y"
                placeholder="Write a short bio about yourself..."
              />
              <p className="text-xs text-muted-foreground mt-1">
                Displayed in the author section on your blog posts.
              </p>
            </div>

            <div className="pt-4 border-t border-border mt-8 flex justify-end max-w-md">
              <Button 
                onClick={handleSave} 
                disabled={isSaving || isUploading || !hasChanges}
                className="h-11 px-8 text-base shadow-sm hover:-translate-y-0.5 transition-all"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" /> Save Changes
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
