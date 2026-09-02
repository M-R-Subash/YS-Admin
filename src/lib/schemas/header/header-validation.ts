import { z } from "zod";
import { buttonTextSchema, urlZodSchema, imageSchema, FieldSchema } from "@/lib/schemas/global-schema";

export const headerZodSchema = z.object({
  logo: imageSchema,
  ctaButton: urlZodSchema,
  navItems: z.array(
    z.object({
      label: buttonTextSchema,
      url: urlZodSchema,
      subItems: z.array(
        z.object({
          label: buttonTextSchema,
          url: urlZodSchema,
        })
      ).optional(),
    })
  ).max(6).optional(),
});


export const headerSchema: FieldSchema[] = [
  {
    name: "logo",
    label: "Header Brand Logo",
    type: "image",
    description: "Upload or select a custom brand logo for the header navbar.",
  },
  {
    name: "ctaButton",
    label: "Call to Action Button",
    type: "url",
    description: "The primary button displayed on the right side of the header.",
  },
  {
    name: "navItems",
    label: "Navigation Links",
    type: "menu-builder",
    description: "The links shown in the center pill. Maximum 6 items.",
  },
];
