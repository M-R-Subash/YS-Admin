"use client";

import {
  useEffect,
  useState,
  useCallback,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronDown } from "lucide-react";
import { EditorRenderer } from "@/components/EditorRenderer";
import type { FieldSchema } from "@/lib/schemas/global-schema";
import { ZodSchema } from "zod";

interface SchemaEditorProps {
  initialData: any;
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  onDataChange?: (data: any) => void;
  uiSchema: FieldSchema[];
  zodSchema: ZodSchema<any>;
  previewEventType: string;
  title?: string;
}

const SchemaEditor = forwardRef(function SchemaEditor(
  {
    initialData,
    iframeRef,
    onDataChange,
    uiSchema,
    zodSchema,
    previewEventType,
    title,
  }: SchemaEditorProps,
  ref,
) {
  const SECTION_KEYS = uiSchema.map((s) => s.name);

  const form = useForm<any>({
    resolver: zodResolver(zodSchema as any),
    defaultValues: initialData || {},
  });

  useImperativeHandle(ref, () => ({
    validate: async () => {
      const isValid = await form.trigger();
      if (!isValid) {
        const errors = form.formState.errors;
        const firstErrorKey = Object.keys(errors)[0];

        let targetAccordion = "";
        for (const section of uiSchema) {
          if (
            section.name === firstErrorKey ||
            section.fields?.some((f) => f.name === firstErrorKey)
          ) {
            targetAccordion = section.name;
            break;
          }
        }

        if (targetAccordion) {
          setOpenSections((prev) => ({ ...prev, [targetAccordion]: true }));

          setTimeout(() => {
            const getFirstErrorPath = (obj: any, currentPath = ""): string => {
              for (const key in obj) {
                const newPath = currentPath ? `${currentPath}.${key}` : key;
                if (obj[key]?.message) return newPath;
                if (obj[key] && typeof obj[key] === "object") {
                  const deep = getFirstErrorPath(obj[key], newPath);
                  if (deep) return deep;
                }
              }
              return "";
            };
            const deepPath = getFirstErrorPath(errors);
            if (deepPath) {
              form.setFocus(deepPath as any);
              const el = document.querySelector(`[name="${deepPath}"]`);
              if (el) {
                el.scrollIntoView({ behavior: "smooth", block: "center" });
              }
            }
          }, 300);
        }
      }
      return isValid;
    },
  }));

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    [SECTION_KEYS[0]]: true,
  });

  useEffect(() => {
    if (initialData) {
      // Auto-migrate corrupted comma-separated highlights into the 4 fixed inputs
      const dataToLoad = JSON.parse(JSON.stringify(initialData));

      if (
        dataToLoad.hero &&
        typeof dataToLoad.hero.highlights === "string" &&
        !dataToLoad.hero.highlight1
      ) {
        const parts = dataToLoad.hero.highlights
          .split(",")
          .map((s: string) => s.trim());
        dataToLoad.hero.highlight1 = parts[0] || "";
        dataToLoad.hero.highlight2 = parts[1] || "";
        dataToLoad.hero.highlight3 = parts[2] || "";
        dataToLoad.hero.highlight4 = parts[3] || "";
      }

      form.reset(dataToLoad);
    }
  }, [initialData, form]);

  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  const sendToPreview = useCallback(
    (data: any) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        iframeRef.current?.contentWindow?.postMessage(
          { type: previewEventType, content: data },
          "*",
        );
      }, 300);
    },
    [iframeRef, previewEventType],
  );

  useEffect(() => {
    const subscription = form.watch((value) => {
      sendToPreview(value);
      if (onDataChange) {
        onDataChange(value);
      }
    });
    return () => subscription.unsubscribe();
  }, [form.watch, sendToPreview, onDataChange]);

  const scrollToSection = useCallback(
    (sectionName: string) => {
      iframeRef.current?.contentWindow?.postMessage(
        { type: "SCROLL_TO_SECTION", section: sectionName },
        "*",
      );
    },
    [iframeRef],
  );

  const toggleSection = (key: string) => {
    setOpenSections((prev) => {
      const isOpening = !prev[key];
      if (isOpening) {
        scrollToSection(key);
      }
      return {
        ...prev,
        [key]: isOpening,
      };
    });
  };

  const expandAll = () => {
    const allOpen = SECTION_KEYS.reduce(
      (acc, key) => ({ ...acc, [key]: true }),
      {},
    );
    setOpenSections(allOpen);
  };

  const collapseAll = () => {
    setOpenSections({});
  };

  return (
    <FormProvider {...form}>
      <form
        onSubmit={(e) => e.preventDefault()}
        className="flex flex-col h-full bg-transparent overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/60 bg-black/3 dark:bg-white/3 backdrop-blur z-10 shrink-0">
          <span className="text-xs font-bold text-black uppercase tracking-wider">
            {title ? `${title} Page Editor` : "Page Editor"}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={expandAll}
              className="text-[11px] font-bold text-black hover:underline bg-transparent cursor-pointer"
            >
              Expand All
            </button>
            <span className="text-xs text-black">|</span>
            <button
              type="button"
              onClick={collapseAll}
              className="text-[11px] font-bold text-black hover:underline bg-transparent cursor-pointer"
            >
              Collapse All
            </button>
          </div>
        </div>

        <div className="p-5 flex-1 overflow-y-auto pb-20 space-y-4">
          {uiSchema.map((section) => {
            const rootField = section.fields?.[0];
            const isSingleObject =
              section.fields?.length === 1 && rootField?.type === "object";

            const renderSchema = isSingleObject
              ? rootField.fields || []
              : section.fields || [];
            const renderPath = isSingleObject ? rootField.name : "";

            return (
              <div
                key={section.name}
                className="border border-border bg-card rounded-sm overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              >
                <div
                  onClick={() => toggleSection(section.name)}
                  className="px-5 py-4 cursor-pointer hover:bg-card-hover flex items-center justify-between font-bold text-sm tracking-wide uppercase select-none"
                >
                  <span>{section.label}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-black transition-transform duration-300 ${openSections[section.name] ? "rotate-180" : ""}`}
                  />
                </div>
                <div
                  className={`grid transition-all duration-300 ease-in-out ${
                    openSections[section.name]
                      ? "grid-rows-[1fr] opacity-100"
                      : "grid-rows-[0fr] opacity-0"
                  }`}
                >
                  <div className="overflow-hidden">
                    <div className="px-5 pb-5 pt-2 border-t">
                      <EditorRenderer
                        schema={renderSchema}
                        control={form.control}
                        path={renderPath}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </form>
    </FormProvider>
  );
});

export default SchemaEditor;
