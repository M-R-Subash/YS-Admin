"use client";

import React from "react";
import { useFieldArray, Controller, Control } from "react-hook-form";
import { Trash2, Plus, ChevronDown, ChevronUp } from "lucide-react";

interface FooterColumnsBlockProps {
  control: Control<any>;
  name: string;
  /** If true, renders a flat list of urlZodSchema items (for socialLinks, policyLinks). 
   *  If false, renders grouped columns with title + nested links (for footer columns). */
  flat?: boolean;
}

function FlatLinkList({ control, name }: { control: Control<any>; name: string }) {
  const { fields, append, remove } = useFieldArray({ control, name });
  const isFixedList = name === "socialLinks";

  return (
    <div className="space-y-3">
      {fields.map((field, index) => (
        <div key={field.id} className="flex flex-col gap-3 p-4 border border-border rounded-sm bg-black/2 dark:bg-white/2 relative group">
          {!isFixedList && (
            <div className="absolute right-2 top-2">
              <button
                type="button"
                onClick={() => remove(index)}
                className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                title="Remove link"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-foreground uppercase tracking-wider">Text</label>
              <Controller
                control={control}
                name={`${name}.${index}.text`}
                render={({ field, fieldState: { error } }) => (
                  <>
                    <input
                      {...field}
                      type="text"
                      placeholder="Link Text"
                      className={`flex h-9 w-full rounded-sm border bg-background px-3 py-1 text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
                        error ? "border-red-500 focus-visible:ring-red-500" : "border-border"
                      }`}
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
                name={`${name}.${index}.url`}
                render={({ field, fieldState: { error } }) => (
                  <>
                    <input
                      {...field}
                      type="text"
                      placeholder="https://..."
                      className={`flex h-9 w-full rounded-sm border bg-background px-3 py-1 text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
                        error ? "border-red-500 focus-visible:ring-red-500" : "border-border"
                      }`}
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
              name={`${name}.${index}.newTab`}
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
              name={`${name}.${index}.noFollow`}
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
      ))}

      {!isFixedList && (
        <button
          type="button"
          onClick={() => append({ text: "", url: "", newTab: false, noFollow: false })}
          className="flex w-full items-center justify-center gap-2 rounded-md border-2 border-dashed border-border p-3 text-xs font-semibold text-foreground hover:border-primary hover:text-primary transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Link
        </button>
      )}
    </div>
  );
}

function ColumnsList({ control, name }: { control: Control<any>; name: string }) {
  const { fields, append, remove } = useFieldArray({ control, name });
  const [collapsed, setCollapsed] = React.useState<Record<number, boolean>>({});

  const toggleCollapse = (index: number) => {
    setCollapsed((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  return (
    <div className="space-y-4">
      {fields.map((field, index) => (
        <div
          key={field.id}
          className="border border-border rounded-md bg-white dark:bg-zinc-900 shadow-sm overflow-hidden"
        >
          {/* Column Header */}
          <div className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-800/50 border-b border-border">
            <button
              type="button"
              onClick={() => toggleCollapse(index)}
              className="p-1 text-zinc-400 hover:text-zinc-600 transition-colors"
            >
              {collapsed[index] ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronUp className="w-4 h-4" />
              )}
            </button>
            <div className="flex-1">
              <Controller
                control={control}
                name={`${name}.${index}.title`}
                render={({ field }) => (
                  <input
                    {...field}
                    type="text"
                    placeholder="Column Title (e.g. Resources)"
                    className="w-full bg-transparent text-sm font-semibold border-none outline-none placeholder:text-zinc-400"
                  />
                )}
              />
            </div>
            <button
              type="button"
              onClick={() => remove(index)}
              className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950 rounded-md transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          {/* Column Links */}
          {!collapsed[index] && (
            <div className="p-4">
              <FlatLinkList control={control} name={`${name}.${index}.links`} />
            </div>
          )}
        </div>
      ))}

      <button
        type="button"
        onClick={() => append({ title: "", links: [] })}
        className="flex w-full items-center justify-center gap-2 rounded-md border-2 border-dashed border-border p-4 text-sm font-semibold text-foreground hover:border-primary hover:text-primary transition-colors"
      >
        <Plus className="h-4 w-4" />
        Add Column
      </button>
    </div>
  );
}

export function FooterColumnsBlock({ control, name, flat = false }: FooterColumnsBlockProps) {
  if (flat) {
    return <FlatLinkList control={control} name={name} />;
  }
  return <ColumnsList control={control} name={name} />;
}
