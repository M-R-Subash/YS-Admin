"use client";

import React from "react";
import { useFieldArray, Controller, Control } from "react-hook-form";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2, Plus } from "lucide-react";

interface MenuBuilderBlockProps {
  control: Control<any>;
  name: string;
}

const SortableItem = ({
  id,
  index,
  control,
  name,
  remove,
}: {
  id: string;
  index: number;
  control: Control<any>;
  name: string;
  remove: (index: number) => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
  };

  const {
    fields: subFields,
    append: appendSubItem,
    remove: removeSubItem,
  } = useFieldArray({
    control,
    name: `${name}.${index}.subItems`,
  });

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`border border-border rounded-md bg-white dark:bg-zinc-900 shadow-sm overflow-hidden ${
        isDragging ? "opacity-50 ring-2 ring-primary" : ""
      }`}
    >
      {/* Top Level Item Header */}
      <div className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-800/50 border-b border-border">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="p-1.5 text-zinc-400 hover:text-zinc-600 cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="w-4 h-4" />
        </button>
        <div className="flex-1 font-semibold text-sm">Main Link #{index + 1}</div>
        <button
          type="button"
          onClick={() => remove(index)}
          className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950 rounded-md transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Top Level Inputs */}
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground uppercase tracking-wider">Label</label>
            <Controller
              control={control}
              name={`${name}.${index}.label`}
              render={({ field, fieldState }) => (
                <input
                  {...field}
                  type="text"
                  placeholder="e.g. Services"
                  className={`flex h-9 w-full rounded-sm border bg-background px-3 py-1 text-sm ${
                    fieldState.error ? "border-red-500" : "border-border"
                  }`}
                />
              )}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground uppercase tracking-wider">URL</label>
            <Controller
              control={control}
              name={`${name}.${index}.url.url`}
              render={({ field, fieldState }) => (
                <input
                  {...field}
                  type="text"
                  placeholder="https://..."
                  className={`flex h-9 w-full rounded-sm border bg-background px-3 py-1 text-sm ${
                    fieldState.error ? "border-red-500" : "border-border"
                  }`}
                />
              )}
            />
          </div>
        </div>

        <div className="flex items-center gap-6">
          <Controller
            control={control}
            name={`${name}.${index}.url.newTab`}
            render={({ field }) => (
              <label className="flex items-center gap-2 text-xs font-bold text-black/50 cursor-pointer hover:text-foreground transition-colors">
                <input
                  type="checkbox"
                  checked={!!field.value}
                  onChange={(e) => field.onChange(e.target.checked)}
                  className="accent-black h-3.5 w-3.5 cursor-pointer"
                />
                Open in new tab
              </label>
            )}
          />
          <Controller
            control={control}
            name={`${name}.${index}.url.noFollow`}
            render={({ field }) => (
              <label className="flex items-center gap-2 text-xs font-bold text-black/50 cursor-pointer hover:text-foreground transition-colors">
                <input
                  type="checkbox"
                  checked={!!field.value}
                  onChange={(e) => field.onChange(e.target.checked)}
                  className="accent-black h-3.5 w-3.5 cursor-pointer"
                />
                No Follow
              </label>
            )}
          />
        </div>

        {/* Sub Items */}
        <div className="mt-6 pt-4 border-t border-border">
          <div className="flex items-center justify-between mb-3">
            <label className="text-xs font-bold text-foreground uppercase tracking-wider">Sub-Menu Links</label>
            <button
              type="button"
              onClick={() => appendSubItem({ label: "", url: { url: "", newTab: false, noFollow: false } })}
              className="text-xs font-semibold flex items-center gap-1.5 text-primary hover:text-primary/80"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Sub-Link
            </button>
          </div>

          {subFields.length === 0 ? (
            <div className="text-xs text-black/40 italic py-2">No sub-links. This will be a standard link.</div>
          ) : (
            <div className="space-y-3">
              {subFields.map((subField, subIndex) => (
                <div key={subField.id} className="relative pl-6 py-2">
                  {/* Decorative line */}
                  <div className="absolute left-1.5 top-0 bottom-0 w-px bg-zinc-200 dark:bg-zinc-800" />
                  <div className="absolute left-1.5 top-1/2 w-3 h-px bg-zinc-200 dark:bg-zinc-800" />

                  <div className="flex gap-3">
                    <div className="flex-1 space-y-1.5">
                      <Controller
                        control={control}
                        name={`${name}.${index}.subItems.${subIndex}.label`}
                        render={({ field }) => (
                          <input
                            {...field}
                            type="text"
                            placeholder="Sub-link Label"
                            className="flex h-8 w-full rounded-sm border border-border bg-background px-2.5 text-sm"
                          />
                        )}
                      />
                    </div>
                    <div className="flex-1 space-y-1.5">
                      <Controller
                        control={control}
                        name={`${name}.${index}.subItems.${subIndex}.url.url`}
                        render={({ field }) => (
                          <input
                            {...field}
                            type="text"
                            placeholder="https://..."
                            className="flex h-8 w-full rounded-sm border border-border bg-background px-2.5 text-sm"
                          />
                        )}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeSubItem(subIndex)}
                      className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950 rounded-md transition-colors self-start"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export function MenuBuilderBlock({ control, name }: MenuBuilderBlockProps) {
  const { fields, append, remove, move } = useFieldArray({
    control,
    name,
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIndex = fields.findIndex((f) => f.id === active.id);
      const newIndex = fields.findIndex((f) => f.id === over?.id);
      move(oldIndex, newIndex);
    }
  };

  return (
    <div className="space-y-4">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={fields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-4">
            {fields.map((field, index) => (
              <SortableItem
                key={field.id}
                id={field.id}
                index={index}
                control={control}
                name={name}
                remove={remove}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <div className="pt-2">
        <button
          type="button"
          onClick={() => append({ label: "", url: { url: "", newTab: false, noFollow: false }, subItems: [] })}
          disabled={fields.length >= 6}
          className="flex w-full items-center justify-center gap-2 rounded-md border-2 border-dashed border-border p-4 text-sm font-semibold text-foreground hover:border-primary hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="h-4 w-4" />
          {fields.length >= 6 ? "Maximum 6 items reached" : "Add Navigation Link"}
        </button>
      </div>
    </div>
  );
}
