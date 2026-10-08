"use client";

import { Code2, Wand2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "@/components/ui/toast";
import { clientConfig } from "@/lib/config/client";

interface SchemaOrgBuilderProps {
  value: any; // string or object
  onChange: (value: any) => void;
  entityType?: "page" | "blog";
  title?: string;
  description?: string;
  url?: string;
  imageUrl?: string;
  authorName?: string;
}

export function SchemaOrgBuilder({
  value,
  onChange,
  entityType = "page",
  title = "",
  description = "",
  url = "",
  imageUrl = "",
  authorName = "",
}: SchemaOrgBuilderProps) {

  // Format value into pretty string
  const stringValue = typeof value === "object" && value !== null
    ? JSON.stringify(value, null, 2)
    : typeof value === "string"
    ? value
    : "";

  let isValidJson = true;
  if (stringValue.trim()) {
    try {
      JSON.parse(stringValue);
    } catch {
      isValidJson = false;
    }
  }

  const handleGenerateDefault = () => {
    const siteUrl = clientConfig.app.frontendUrl;
    const fullUrl = url.startsWith("http") ? url : `${siteUrl}${url.startsWith("/") ? url : `/${url}`}`;

    let schema: any;

    if (entityType === "blog") {
      schema = {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        "headline": title || "Article Headline",
        "description": description || "",
        "image": imageUrl || undefined,
        "url": fullUrl,
        "author": authorName
          ? {
              "@type": "Person",
              "name": authorName,
            }
          : {
              "@type": "Organization",
              "name": "YS Innovations",
              "url": siteUrl,
            },
        "publisher": {
          "@type": "Organization",
          "name": "YS Innovations",
          "logo": {
            "@type": "ImageObject",
            "url": `${siteUrl}/logo.png`,
          },
        },
        "mainEntityOfPage": {
          "@type": "WebPage",
          "@id": fullUrl,
        },
      };
    } else {
      schema = {
        "@context": "https://schema.org",
        "@type": "WebPage",
        "name": title || "Page Title",
        "description": description || "",
        "url": fullUrl,
        "primaryImageOfPage": imageUrl || undefined,
        "publisher": {
          "@type": "Organization",
          "name": "YS Innovations",
          "url": siteUrl,
        },
      };
    }

    onChange(JSON.stringify(schema, null, 2));
    toast.add({
      title: "Schema.org Generated",
      description: `Generated valid ${entityType === "blog" ? "BlogPosting" : "WebPage"} structured data.`,
      type: "success",
    });
  };


  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
          <Code2 className="size-3.5 text-primary" />
          JSON-LD Structured Data (Schema.org)
        </Label>
        <div className="flex items-center gap-1.5">
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateDefault}
                  className="h-7 px-2.5 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Wand2 className="size-3 text-amber-500" />
                  <span>Generate Schema</span>
                </Button>
              }
            />
            <TooltipContent side="top" className="text-xs max-w-xs font-medium">
              Auto-generate Schema.org template from current title and description
            </TooltipContent>
          </Tooltip>

          {stringValue && (
            <CopyButton
              value={stringValue}
              label="JSON-LD Schema"
              iconClassName="size-3"
              className="h-7 px-2 text-[11px] font-semibold cursor-pointer text-muted-foreground hover:text-foreground"
            />
          )}
        </div>
      </div>

      <div className="relative">
        <textarea
          rows={5}
          value={stringValue}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`{\n  "@context": "https://schema.org",\n  "@type": "${entityType === "blog" ? "BlogPosting" : "WebPage"}",\n  ...\n}`}
          className={`w-full rounded-md border bg-card p-3 text-xs font-mono shadow-2xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 ${
            !isValidJson && stringValue.trim()
              ? "border-destructive focus-visible:ring-destructive"
              : "border-border focus-visible:ring-ring"
          }`}
        />
      </div>

      {!isValidJson && stringValue.trim() ? (
        <p className="text-[11px] font-semibold text-destructive flex items-center gap-1">
          <AlertCircle className="size-3" />
          Invalid JSON syntax. Please verify commas and quotes.
        </p>
      ) : (
        <p className="text-[10px] text-muted-foreground">
          Enables Google rich snippets (breadcrumbs, article carousels, FAQ accordions).
        </p>
      )}
    </div>
  );
}
