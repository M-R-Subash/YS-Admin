import { z } from "zod";
import { imageSchema, urlZodSchema } from "@/lib/schemas/global-schema";

export const careersSchema = z.object({
  hero: z.object({
    badge: z.string().optional(),
    title: z.string().optional(),
    highlight: z.string().optional(),
    description: z.string().optional(),
    cta: urlZodSchema,
    image: imageSchema,
  }).optional(),
  
  marquee: z.object({
    departments: z.array(
      z.object({
        name: z.string().optional(),
      })
    ).optional(),
  }).optional(),

  whyHere: z.object({
    badge: z.string().optional(),
    title: z.string().optional(),
    highlight: z.string().optional(),
    description: z.string().optional(),
    image: imageSchema,
    features: z.array(
      z.object({
        number: z.string().optional(),
        title: z.string().optional(),
        description: z.string().optional(),
      })
    ).optional(),
  }).optional(),

  openPositions: z.object({
    badge: z.string().optional(),
    title: z.string().optional(),
    highlight: z.string().optional(),
    jobs: z.array(
      z.object({
        title: z.string().optional(),
        description: z.string().optional(),
        location: z.string().optional(),
        experience: z.string().optional(),
        type: z.string().optional(),
        link: urlZodSchema,
      })
    ).optional(),
  }).optional(),

  realPeople: z.object({
    badge: z.string().optional(),
    title: z.string().optional(),
    highlight: z.string().optional(),
    description: z.string().optional(),
    image1: imageSchema,
    image2: imageSchema,
    image3: imageSchema,
    image4: imageSchema,
  }).optional(),

  testimonialsSection: z.object({
    badge: z.string().optional(),
    title: z.string().optional(),
    highlight: z.string().optional(),
    testimonials: z.array(
      z.object({
        quote: z.string().optional(),
        name: z.string().optional(),
        role: z.string().optional(),
        avatar: imageSchema,
      })
    ).optional(),
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

export type CareersData = z.infer<typeof careersSchema>;
