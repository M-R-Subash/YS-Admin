"use client";

import { useFieldArray, Controller } from "react-hook-form";
import type { FieldSchema } from "@/lib/schemas/global-schema";
import { useEffect, useRef } from "react";
import { ImageUploadBlock } from "@/components/ImageUploadBlock";
import { MenuBuilderBlock } from "@/components/MenuBuilderBlock";
import { FooterColumnsBlock } from "@/components/FooterColumnsBlock";

function AutoResizeTextarea({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: any;
  placeholder?: string;
  className?: string;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        textareaRef.current.scrollHeight + "px";
    }
  }, [value]);

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={1}
      className={`w-full px-4 py-2.5 bg-background border rounded-sm text-foreground text-sm font-medium transition-colors resize-none overflow-hidden focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${className || "border-border"}`}
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
                <p className="text-xs text-muted font-medium mt-1">
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
                render={({ field: { onChange, value, ref }, fieldState: { error } }) => (
                  <div className="flex flex-col gap-1">
                    <input
                      ref={ref}
                      type="text"
                      value={Array.isArray(value) ? value.join(", ") : value || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        onChange(val ? val.split(",").map((s) => s.trim()).filter(Boolean) : []);
                      }}
                      placeholder="tag1, tag2, tag3"
                      className={`w-full px-4 py-2.5 bg-background border rounded-sm text-foreground text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
                        error ? "border-red-500 focus-visible:ring-red-500" : "border-border"
                      }`}
                    />
                    {error && (
                      <span className="text-red-500 text-[11px] font-bold tracking-wide mt-0.5">
                        {error.message}
                      </span>
                    )}
                  </div>
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
                      className={
                        error
                          ? "border-red-500 focus-visible:ring-red-500"
                          : ""
                      }
                    />
                  ) : (
                    <input
                      ref={ref}
                      type={field.type === "url" ? "text" : field.type}
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
  const { fields } = useFieldArray({
    control,
    name: fieldName,
  });

  return (
    <div className="space-y-4">
      {fields.map((item, index) => (
        <div
          key={item.id}
          className="bg-card-hover border border-border p-5 rounded-sm shadow-sm relative"
        >
          <div className="absolute top-0 left-0 bg-black text-white text-[10px] font-bold px-3 py-1 rounded-br-sm rounded-tl-sm uppercase tracking-wider">
            Item {index + 1}
          </div>
          <div className="mt-2">
            <EditorRenderer
              schema={field.fields || []}
              control={control}
              path={`${fieldName}.${index}`}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
