"use client";

import { useFieldArray, Controller } from "react-hook-form";
import type { FieldSchema } from "@/lib/schemas/global-schema";
import { useEffect, useRef, useCallback, useLayoutEffect } from "react";
import { cn } from "@/lib/utils";
import { ImageUploadBlock } from "@/components/ImageUploadBlock";
import { MenuBuilderBlock } from "@/components/MenuBuilderBlock";
import { FooterColumnsBlock } from "@/components/FooterColumnsBlock";
import FaqManager from "@/components/faq/FaqManager";
import { Switch } from "@/components/ui/switch";
import { TagInput } from "@/components/ui/tag-input";
import { Trash2, Plus } from "lucide-react";

const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

function AutoResizeTextarea({
  value,
  onChange,
  placeholder,
  className,
  rows = 2,
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  className?: string;
  rows?: number;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    if (el.scrollHeight > 0) {
      el.style.height = `${el.scrollHeight}px`;
    }
  }, []);

  useIsomorphicLayoutEffect(() => {
    adjustHeight();
  }, [value, adjustHeight]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;

    const observer = new ResizeObserver(() => {
      if (el.offsetParent !== null) {
        adjustHeight();
      }
    });
    observer.observe(el);

    return () => {
      observer.disconnect();
    };
  }, [adjustHeight]);

  return (
    <textarea
      ref={textareaRef}
      value={value || ""}
      onChange={(e) => {
        onChange(e);
        adjustHeight();
      }}
      onInput={adjustHeight}
      placeholder={placeholder}
      rows={rows}
      className={cn(
        "w-full px-4 py-2.5 bg-background border rounded-sm text-foreground text-sm font-medium leading-relaxed transition-colors resize-none overflow-hidden break-words whitespace-pre-wrap focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        rows <= 2 ? "min-h-[46px]" : "min-h-[88px]",
        className || "border-border"
      )}
    />
  );
}

interface EditorRendererProps {
  schema: FieldSchema[];
  control: any;
  path?: string;
}

export function EditorRenderer({
  schema,
  control,
  path = "",
}: EditorRendererProps) {
  return (
    <div className="space-y-6">
      {schema.map((field) => {
        const fieldName = path ? `${path}.${field.name}` : field.name;

        if (field.type === "object") {
          return (
            <div key={fieldName} className="flex flex-col gap-6">
              <div>
                <h3 className="font-bold text-foreground text-sm">
                  {field.label}
                </h3>
                {field.description && (
                  <p className="text-xs text-black/50 mt-0.5">
                    {field.description}
                  </p>
                )}
              </div>
              <EditorRenderer
                schema={field.fields || []}
                control={control}
                path={fieldName}
              />
            </div>
          );
        }

        if (field.type === "image") {
          return (
            <div key={fieldName} className="flex flex-col gap-3">
              <label className="text-[13px] font-bold text-foreground uppercase tracking-wider">
                {field.label}
              </label>
              <Controller
                control={control}
                name={fieldName}
                render={({ field: { value, onChange }, fieldState }) => (
                  <div className="flex flex-col gap-1.5">
                    <ImageUploadBlock value={value} onChange={onChange} />
                    {fieldState.error && (
                      <span className="text-xs font-semibold text-red-500 bg-red-500/10 px-2 py-1 rounded-sm w-fit">
                        {fieldState.error.message ||
                          (fieldState.error as any)?.url?.message ||
                          (fieldState.error as any)?.alt?.message ||
                          "Invalid image data"}
                      </span>
                    )}
                  </div>
                )}
              />
              {field.description && (
                <p className="text-xs text-muted-foreground mt-1">
                  {field.description}
                </p>
              )}
            </div>
          );
        }

        if (field.type === "url") {
          return (
            <div key={fieldName} className="flex flex-col gap-3 p-4 border border-border rounded-sm bg-black/2 dark:bg-white/2">
              <div>
                <label className="text-[13px] font-bold text-foreground uppercase tracking-wider">
                  {field.label}
                </label>
                {field.description && (
                  <p className="text-[11px] text-black/50 font-medium mt-0.5">
                    {field.description}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-foreground uppercase tracking-wider">Text</label>
                  <Controller
                    control={control}
                    name={`${fieldName}.text`}
                    render={({ field: { value, onChange, ref }, fieldState: { error } }) => (
                      <>
                        <input
                          ref={ref}
                          type="text"
                          value={value || ""}
                          onChange={onChange}
                          className={`flex h-9 w-full rounded-sm border bg-background px-3 py-1 text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
                            error ? "border-red-500 focus-visible:ring-red-500" : "border-border"
                          }`}
                          placeholder="Link Text"
                        />
                        {error && <span className="text-red-500 text-[10px] font-bold">{error.message}</span>}
                      </>
                    )}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-foreground uppercase tracking-wider">URL</label>
                  <Controller
                    control={control}
                    name={`${fieldName}.url`}
                    render={({ field: { value, onChange, ref }, fieldState: { error } }) => (
                      <>
                        <input
                          ref={ref}
                          type="text"
                          value={value || ""}
                          onChange={onChange}
                          className={`flex h-9 w-full rounded-sm border bg-background px-3 py-1 text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
                            error ? "border-red-500 focus-visible:ring-red-500" : "border-border"
                          }`}
                          placeholder="https://..."
                        />
                        {error && <span className="text-red-500 text-[10px] font-bold">{error.message}</span>}
                      </>
                    )}
                  />
                </div>
              </div>
              <div className="flex items-center gap-6 mt-1">
                <Controller
                  control={control}
                  name={`${fieldName}.newTab`}
                  render={({ field: { value, onChange } }) => (
                    <label className="flex items-center gap-2 text-xs font-bold text-black/50 cursor-pointer hover:text-foreground transition-colors">
                      <input
                        type="checkbox"
                        checked={!!value}
                        onChange={(e) => onChange(e.target.checked)}
                        className="accent-black rounded-sm border-border bg-background text-black h-3.5 w-3.5 cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1"
                      />
                      Open in new tab
                    </label>
                  )}
                />
                <Controller
                  control={control}
                  name={`${fieldName}.noFollow`}
                  render={({ field: { value, onChange } }) => (
                    <label className="flex items-center gap-2 text-xs font-bold text-black/50 cursor-pointer hover:text-foreground transition-colors">
                      <input
                        type="checkbox"
                        checked={!!value}
                        onChange={(e) => onChange(e.target.checked)}
                        className="accent-black rounded-sm border-border bg-background text-black h-3.5 w-3.5 cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1"
                      />
                      Nofollow
                    </label>
                  )}
                />
              </div>
            </div>
          );
        }

        if (field.type === "menu-builder") {
          return (
            <div key={fieldName} className="flex flex-col gap-3 p-4 border border-border rounded-sm bg-black/2 dark:bg-white/2">
              <div>
                <label className="text-[13px] font-bold text-foreground uppercase tracking-wider">
                  {field.label}
                </label>
                {field.description && (
                  <p className="text-[11px] text-black/50 font-medium mt-0.5">
                    {field.description}
                  </p>
                )}
              </div>
              <MenuBuilderBlock control={control} name={fieldName} />
            </div>
          );
        }
        if (field.type === "footer-columns") {
          // Detect if this is a flat list (socialLinks, policyLinks) or grouped columns
          const isFlat = field.name === "socialLinks" || field.name === "policyLinks";
          return (
            <div key={fieldName} className="flex flex-col gap-3 p-4 border border-border rounded-sm bg-black/2 dark:bg-white/2">
              <div>
                <label className="text-[13px] font-bold text-foreground uppercase tracking-wider">
                  {field.label}
                </label>
                {field.description && (
                  <p className="text-[11px] text-black/50 font-medium mt-0.5">
                    {field.description}
                  </p>
                )}
              </div>
              <FooterColumnsBlock control={control} name={fieldName} flat={isFlat} />
            </div>
          );
        }

        if (field.type === "faq-manager") {
          return (
            <div key={fieldName} className="flex flex-col gap-3 p-5 border border-border rounded-xl bg-card shadow-xs">
              <Controller
                name={fieldName}
                control={control}
                render={({ field: { value, onChange } }) => (
                  <FaqManager
                    value={value || []}
                    onChange={onChange}
                    title={field.label || "Frequently Asked Questions"}
                    description={field.description}
                  />
                )}
              />
            </div>
          );
        }

        if (field.type === "array") {
          return (
            <ArrayRenderer
              key={fieldName}
              field={field}
              fieldName={fieldName}
              control={control} 
            />
          );
        }

        if (field.type === "tags") {
          return (
            <div key={fieldName} className="flex flex-col gap-1.5 flex-1">
              <label className="text-xs font-bold text-foreground uppercase tracking-wider">
                {field.label}
              </label>
              <Controller
                name={fieldName}
                control={control}
                render={({ field: { onChange, value }, fieldState: { error } }) => (
                  <div className="flex flex-col gap-1">
                    <TagInput
                      value={Array.isArray(value) ? value : value ? [String(value)] : []}
                      onChange={onChange}
                      placeholder={field.placeholder || "Type and press Enter..."}
                      className={error ? "border-red-500 focus-visible:ring-red-500" : undefined}
                    />
                    {error && (
                      <span className="text-red-500 text-[11px] font-bold tracking-wide mt-0.5">
                        {error.message}
                      </span>
                    )}
                  </div>
                )}
              />
              {field.description && (
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {field.description}
                </p>
              )}
            </div>
          );
        }

        if (field.type === "boolean") {
          return (
            <div
              key={fieldName}
              className="flex items-center justify-between p-5 border border-border/70 rounded-xl bg-muted/20 shadow-xs"
            >
              <div>
                <label className="text-sm font-bold text-foreground cursor-pointer">
                  {field.label}
                </label>
                {field.description && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {field.description}
                  </p>
                )}
              </div>
              <Controller
                name={fieldName}
                control={control}
                render={({ field: { value, onChange } }) => (
                  <Switch
                    checked={Boolean(value)}
                    onCheckedChange={onChange}
                  />
                )}
              />
            </div>
          );
        }

        // Base types (text, url, textarea)
        return (
          <div key={fieldName} className="flex flex-col gap-1.5 flex-1">
            <label className="text-xs font-bold text-foreground uppercase tracking-wider">
              {field.label}
            </label>
            <Controller
              name={fieldName}
              control={control}
              render={({
                field: { onChange, value, ref },
                fieldState: { error },
              }) => (
                <div className="flex flex-col gap-1">
                  {field.type === "textarea" ? (
                    <AutoResizeTextarea
                      value={value || ""}
                      onChange={onChange}
                      placeholder={field.placeholder}
                      rows={field.rows}
                      className={
                        error
                          ? "border-red-500 focus-visible:ring-red-500"
                          : ""
                      }
                    />
                  ) : (
                    <input
                      ref={ref}
                      type={field.type}
                      value={value || ""}
                      onChange={onChange}
                      placeholder={field.placeholder}
                      className={`w-full px-4 py-2.5 bg-background border rounded-sm text-foreground text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
                        error
                          ? "border-red-500 focus-visible:ring-red-500"
                          : "border-border"
                      }`}
                    />
                  )}
                  {error && (
                    <span className="text-red-500 text-[11px] font-bold tracking-wide mt-0.5">
                      {error.message}
                    </span>
                  )}
                </div>
              )}
            />
            {field.description && (
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {field.description}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ArrayRenderer({
  field,
  fieldName,
  control,
}: {
  field: FieldSchema;
  fieldName: string;
  control: any;
}) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: fieldName,
  });

  return (
    <div className="space-y-4">
      {fields.length === 0 && (
        <div className="border border-dashed border-border/80 rounded-sm p-4 text-center text-xs text-muted-foreground bg-muted/20">
          No items added yet. Click &quot;Add {field.label || "Item"}&quot; to create one.
        </div>
      )}
      {fields.map((item, index) => (
        <div
          key={item.id}
          className="bg-card-hover border border-border p-5 rounded-sm shadow-sm relative"
        >
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-border/60">
            <div className="inline-flex items-center bg-black text-white text-[10px] font-bold px-2.5 py-0.5 rounded-sm uppercase tracking-wider">
              Item {index + 1}
            </div>
            <button
              type="button"
              onClick={() => remove(index)}
              className="p-1 text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-sm transition-colors cursor-pointer"
              title="Remove item"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
          <div>
            <EditorRenderer
              schema={field.fields || []}
              control={control}
              path={`${fieldName}.${index}`}
            />
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={() => {
          const defaultItem: Record<string, any> = {};
          if (field.fields) {
            field.fields.forEach((f) => {
              defaultItem[f.name] = f.type === "array" || f.type === "tags" ? [] : "";
            });
          }
          append(defaultItem);
        }}
        className="w-full flex items-center justify-center gap-2 py-2.5 border border-dashed border-border hover:border-black/50 dark:hover:border-white/50 rounded-sm text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 transition-all cursor-pointer"
      >
        <Plus className="w-3.5 h-3.5" />
        Add {field.label ? field.label.replace(/s$/, "") : "Item"}
      </button>
    </div>
  );
}
