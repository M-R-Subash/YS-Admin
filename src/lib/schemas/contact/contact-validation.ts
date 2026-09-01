import { z } from "zod";
import { imageSchema } from "@/lib/schemas/global-schema";

export const contactSchema = z.object({
  hero: z.object({
    badge: z.string().optional(),
    title: z.string().optional(),
    highlight: z.string().optional(),
    description: z.string().optional(),
  }).optional(),

  contactCards: z.object({
    phone: z.string().optional(),
    phoneDescription: z.string().optional(),
    email: z.string().optional(),
    emailDescription: z.string().optional(),
    location: z.string().optional(),
    locationDescription: z.string().optional(),
  }).optional(),

  formSection: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    image: imageSchema,
    imageTitle: z.string().optional(),
    imageDescription: z.string().optional(),
  }).optional(),

  services: z.array(
    z.object({
      label: z.string().optional(),
      detail: z.string().optional(),
    })
  ).optional(),

  trustSignals: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    items: z.array(
      z.object({
        title: z.string().optional(),
        description: z.string().optional(),
      })
    ).optional(),
  }).optional(),

  locationSection: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    mapImage: imageSchema,
    address: z.string().optional(),
    hours: z.string().optional(),
  }).optional(),

  faqs: z.object({
    badge: z.string().optional(),
    title: z.string().optional(),
    graphicTitleLine1: z.string().optional(),
    graphicTitleLine2: z.string().optional(),
    graphicTitleLine3: z.string().optional(),
    graphicTitleLine4: z.string().optional(),
    graphicImage: imageSchema,
    list: z.array(
      z.object({
        question: z.string().optional(),
        answer: z.string().optional(),
      })
    ).optional(),
  }).optional(),
});

export type ContactData = z.infer<typeof contactSchema>;
