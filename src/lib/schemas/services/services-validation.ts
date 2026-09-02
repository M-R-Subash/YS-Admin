import { z } from "zod";
import { imageSchema, urlZodSchema } from "@/lib/schemas/global-schema";

export const servicesSchema = z.object({
  hero: z.object({
    badge: z.string().optional(),
    title: z.string().optional(),
    titleHighlight: z.string().optional(),
    description: z.string().optional(),
    tags: z.array(z.string()).optional(),
    cta: urlZodSchema,
    secondaryCta: urlZodSchema,
    image: imageSchema,
  }).optional(),

  whyItMatters: z.object({
    badge: z.string().optional(),
    title: z.string().optional(),
    description: z.string().optional(),
    image: imageSchema,
    metrics: z.array(
      z.object({
        stat: z.string().optional(),
        title: z.string().optional(),
        desc: z.string().optional(),
      })
    ).optional(),
  }).optional(),

  fullStackEngine: z.object({
    badge: z.string().optional(),
    title: z.string().optional(),
    description: z.string().optional(),
    services: z.array(
      z.object({
        title: z.string().optional(),
        desc: z.string().optional(),
      })
    ).optional(),
    layersBadge: z.string().optional(),
    layersTitle: z.string().optional(),
    layers: z.array(
      z.object({
        num: z.string().optional(),
        title: z.string().optional(),
        desc: z.string().optional(),
      })
    ).optional(),
  }).optional(),

  processSection: z.object({
    badge: z.string().optional(),
    title: z.string().optional(),
    description: z.string().optional(),
    steps: z.array(
      z.object({
        num: z.string().optional(),
        title: z.string().optional(),
        desc: z.string().optional(),
      })
    ).optional(),
    outcomesBadge: z.string().optional(),
    outcomesTitle: z.string().optional(),
    outcomesDescription: z.string().optional(),
    outcomes: z.array(
      z.object({
        stat: z.string().optional(),
        title: z.string().optional(),
        desc: z.string().optional(),
      })
    ).optional(),
  }).optional(),

  caseStudiesSection: z.object({
    badge: z.string().optional(),
    title: z.string().optional(),
    titleHighlight: z.string().optional(),
    description: z.string().optional(),
    items: z.array(
      z.object({
        category: z.string().optional(),
        title: z.string().optional(),
        desc: z.string().optional(),
        tags: z.array(z.string()).optional(),
        stat1: z.string().optional(),
        label1: z.string().optional(),
        stat2: z.string().optional(),
        label2: z.string().optional(),
        image: imageSchema,
      })
    ).optional(),
    strategyBadge: z.string().optional(),
    strategyTitleLine1: z.string().optional(),
    strategyTitleLine2: z.string().optional(),
    strategyTitleHighlight: z.string().optional(),
    strategyPoints: z.array(
      z.object({
        num: z.string().optional(),
        title: z.string().optional(),
        desc: z.string().optional(),
        footerTag: z.string().optional(),
      })
    ).optional(),
    assuranceBadge: z.string().optional(),
    assuranceTitle: z.string().optional(),
    assuranceHighlight: z.string().optional(),
    assuranceDescription: z.string().optional(),
    assuranceImage: imageSchema,
  }).optional(),

  whoWeAreSection: z.object({
    badge: z.string().optional(),
    title: z.string().optional(),
    titleHighlight: z.string().optional(),
    titleEnd: z.string().optional(),
    description: z.string().optional(),
    cta: urlZodSchema,
    secondaryCta: urlZodSchema,
    image: imageSchema,
    metrics: z.array(
      z.object({
        stat: z.string().optional(),
        title: z.string().optional(),
        desc: z.string().optional(),
      })
    ).optional(),
  }).optional(),

  problemsSection: z.object({
    badge: z.string().optional(),
    title: z.string().optional(),
    titleHighlight: z.string().optional(),
    description: z.string().optional(),
    image: imageSchema,
    cards: z.array(
      z.object({
        title: z.string().optional(),
        desc: z.string().optional(),
      })
    ).optional(),
  }).optional(),

  perspectivesSection: z.object({
    badge: z.string().optional(),
    title: z.string().optional(),
    titleHighlight: z.string().optional(),
    cards: z.array(
      z.object({
        category: z.string().optional(),
        title: z.string().optional(),
        readTime: z.string().optional(),
        image: imageSchema,
      })
    ).optional(),
  }).optional(),

  faqsSection: z.object({
    badge: z.string().optional(),
    title: z.string().optional(),
    graphicImage: imageSchema,
    graphicTitleLine1: z.string().optional(),
    graphicTitleLine2: z.string().optional(),
    graphicTitleLine3: z.string().optional(),
    graphicTitleLine4: z.string().optional(),
    list: z.array(
      z.object({
        question: z.string().optional(),
        answer: z.string().optional(),
      })
    ).optional(),
  }).optional(),
});

export type ServicesData = z.infer<typeof servicesSchema>;
