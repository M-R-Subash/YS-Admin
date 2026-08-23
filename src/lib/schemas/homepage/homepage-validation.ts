import { z } from "zod";
import { imageSchema, urlZodSchema } from "@/lib/schemas/global-schema";

export const homepageSchema = z.object({
  hero: z.object({
    badge: z.string().optional(),
    title: z.string().optional(),
    subtext: z.string().optional(),
    image: imageSchema,
    bgImage: imageSchema,
    cta: urlZodSchema,
    secondaryCta: urlZodSchema,
    highlight1: z.string().optional(),
    highlight2: z.string().optional(),
    highlight3: z.string().optional(),
    highlight4: z.string().optional(),
  }).optional(),
  
  trusted: z.object({
    title: z.string().optional(),
    count: z.string().optional(),
    subtext: z.string().optional(),
    logos: z.array(
      z.object({
        name: z.string(),
        src: imageSchema,
      })
    ).optional(),
  }).optional(),
  
  servicesSection: z.object({
    badge: z.string().optional(),
    title: z.string().optional(),
  }).optional(),
  
  services: z.array(
    z.object({
      id: z.string().optional(),
      image: imageSchema,
      category: z.string().optional(),
      title: z.string().optional(),
      description: z.string().optional(),
      tags: z.array(z.string()).optional(),
      link: urlZodSchema,
    })
  ).optional(),

  projectsSection: z.object({
    badge: z.string().optional(),
    title: z.string().optional(),
    cta: urlZodSchema,
  }).optional(),
  
  projects: z.array(
    z.object({
      id: z.union([z.string(), z.number()]).optional(),
      title: z.string().optional(),
      desc: z.string().optional(),
      img: imageSchema,
      link: urlZodSchema,
    })
  ).optional(),
  
  process: z.object({
    badge: z.string().optional(),
    title: z.string().optional(),
    cta: urlZodSchema,
    steps: z.array(
      z.object({
        title: z.string().optional(),
        desc: z.string().optional(),
        list: z.array(z.string()).optional(),
      })
    ).optional(),
  }).optional(),
  
  simpleSteps: z.object({
    badge: z.string().optional(),
    title: z.string().optional(),
    bgImage: imageSchema,
    steps: z.array(
      z.object({
        num: z.string().optional(),
        title: z.string().optional(),
        desc: z.string().optional(),
      })
    ).optional(),
  }).optional(),
  
  industries: z.object({
    badge: z.string().optional(),
    title: z.string().optional(),
    description: z.string().optional(),
    cta: urlZodSchema,
    list: z.array(
      z.object({
        title: z.string().optional(),
        desc: z.string().optional(),
      })
    ).optional(),
  }).optional(),
  
  technologies: z.object({
    badge: z.string().optional(),
    title: z.string().optional(),
    list: z.array(
      z.object({
        icon: imageSchema,
        name: z.string().optional(),
        desc: z.string().optional(),
      })
    ).optional(),
  }).optional(),
  
  productsSection: z.object({
    badge: z.string().optional(),
    title: z.string().optional(),
    description: z.string().optional(),
  }).optional(),
  
  ysProducts: z.array(
    z.object({
      id: z.string().optional(),
      title: z.string().optional(),
      desc: z.string().optional(),
      badge: z.string().optional(),
      logo: imageSchema,
      headline: z.string().optional(),
      text: z.string().optional(),
      img: imageSchema,
      comingSoon: z.boolean().optional(),
    })
  ).optional(),
  
  testimonialsSection: z.object({
    badge: z.string().optional(),
    title: z.string().optional(),
    description: z.string().optional(),
  }).optional(),
  
  testimonials: z.array(
    z.object({
      name: z.string().optional(),
      role: z.string().optional(),
      quote: z.string().optional(),
    })
  ).optional(),
  
  whyChooseUs: z.object({
    badge: z.string().optional(),
    title: z.string().optional(),
    description: z.string().optional(),
    bgImage: imageSchema,
    rightImage: imageSchema,
    features: z.array(
      z.object({
        title: z.string().optional(),
        desc: z.string().optional(),
      })
    ).optional(),
    marquee: z.array(z.string()).optional(),
  }).optional(),
  
  connect: z.object({
    badge: z.string().optional(),
    title: z.string().optional(),
    titleHighlight: z.string().optional(),
    description: z.string().optional(),
    image: imageSchema,
    cta: urlZodSchema,

    secondaryCta: urlZodSchema,
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

export type HomepageData = z.infer<typeof homepageSchema>;
