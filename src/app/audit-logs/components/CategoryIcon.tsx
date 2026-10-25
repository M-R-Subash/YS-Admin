import React from "react";
import {
  FileText,
  BookOpen,
  ArrowRightLeft,
  Hash,
  Mail,
  Image as ImageIcon,
  MessageSquare,
  Users,
  Settings as SettingsIcon,
  Layers,
  KeyRound,
  ShieldCheck,
} from "lucide-react";
import type { AuditCategory } from "../types";

export interface CategoryIconProps {
  category: AuditCategory;
  className?: string;
}

export const CategoryIcon = React.memo(function CategoryIcon({
  category,
  className,
}: CategoryIconProps) {
  switch (category) {
    case "PAGES":
      return <FileText className={className} />;
    case "BLOGS":
      return <BookOpen className={className} />;
    case "REDIRECTIONS":
      return <ArrowRightLeft className={className} />;
    case "TAXONOMY":
      return <Hash className={className} />;
    case "NEWSLETTERS":
      return <Mail className={className} />;
    case "MEDIA":
      return <ImageIcon className={className} />;
    case "COMMENTS":
      return <MessageSquare className={className} />;
    case "USERS":
      return <Users className={className} />;
    case "SETTINGS":
      return <SettingsIcon className={className} />;
    case "AUTH":
      return <KeyRound className={className} />;
    case "SECURITY":
      return <ShieldCheck className={className} />;
    default:
      return <Layers className={className} />;
  }
});
