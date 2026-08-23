import type { FieldSchema } from "@/lib/schemas/global-schema";

export const homepageUiSchema: FieldSchema[] = [
  {
    name: "hero",
    label: "Hero Section",
    type: "accordion",
    fields: [
      {
        name: "hero",
        label: "Hero Details",
        type: "object",
        fields: [
          { name: "badge", label: "Badge", type: "text" },
          { name: "title", label: "Title", type: "text" },
          { name: "subtext", label: "Subtext", type: "textarea" },
          { name: "image", label: "Foreground Image URL", type: "image" },
          { name: "bgImage", label: "Background Image URL", type: "image" },
          { name: "cta", label: "Primary CTA", type: "url" },
          { name: "secondaryCta", label: "Secondary CTA", type: "url" },
          { name: "highlight1", label: "Highlight 1", type: "text" },
          { name: "highlight2", label: "Highlight 2", type: "text" },
          { name: "highlight3", label: "Highlight 3", type: "text" },
          { name: "highlight4", label: "Highlight 4", type: "text" },
        ],
      }
    ]
  },
  {
    name: "trusted",
    label: "Trusted By",
    type: "accordion",
    fields: [
      {
        name: "trusted",
        label: "Trusted By Details",
        type: "object",
        fields: [
          { name: "title", label: "Title", type: "text" },
          { name: "subtext", label: "Subtext", type: "text" },
          { name: "count", label: "Count (e.g. 100+)", type: "text" },
          {
            name: "logos",
            label: "Partner Logos",
            type: "array",
            fields: [
              { name: "name", label: "Company Name", type: "text" },
              { name: "src", label: "Logo URL", type: "image" },
            ]
          }
        ]
      }
    ]
  },
  {
    name: "servicesGroup",
    label: "Services",
    type: "accordion",
    fields: [
      {
        name: "servicesSection",
        label: "Services Header Details",
        type: "object",
        fields: [
          { name: "badge", label: "Badge", type: "text" },
          { name: "title", label: "Title", type: "text" },
        ]
      },
      {
        name: "services",
        label: "Service Items",
        type: "array",
        fields: [
          { name: "image", label: "Image URL", type: "image" },
          { name: "category", label: "Category", type: "text" },
          { name: "title", label: "Title", type: "text" },
          { name: "description", label: "Description", type: "textarea" },
          { name: "tags", label: "Tags (comma separated)", type: "tags" },
          { name: "link", label: "Service CTA Button", type: "url" },
        ]
      }
    ]
  },
  {
    name: "projectsGroup",
    label: "Projects",
    type: "accordion",
    fields: [
      {
        name: "projectsSection",
        label: "Projects Header Details",
        type: "object",
        fields: [
          { name: "badge", label: "Badge", type: "text" },
          { name: "title", label: "Title", type: "text" },
          { name: "cta", label: "CTA Button", type: "url" },
        ]
      },
      {
        name: "projects",
        label: "Project Items",
        type: "array",
        fields: [
          { name: "title", label: "Title", type: "text" },
          { name: "desc", label: "Description", type: "textarea" },
          { name: "img", label: "Image URL", type: "image" },
          { name: "link", label: "Link Button", type: "url" },
        ]
      }
    ]
  },
  {
    name: "process",
    label: "Our Process",
    type: "accordion",
    fields: [
      {
        name: "process",
        label: "Process Details",
        type: "object",
        fields: [
          { name: "badge", label: "Badge", type: "text" },
          { name: "title", label: "Title", type: "text" },
          { name: "cta", label: "CTA Button", type: "url" },
          {
            name: "steps",
            label: "Process Steps",
            type: "array",
            fields: [
              { name: "title", label: "Title", type: "text" },
              { name: "desc", label: "Description", type: "textarea" },
            ]
          }
        ]
      }
    ]
  },
  {
    name: "simpleSteps",
    label: "Simple Steps (Alternate Process)",
    type: "accordion",
    fields: [
      {
        name: "simpleSteps",
        label: "Steps Details",
        type: "object",
        fields: [
          { name: "badge", label: "Badge", type: "text" },
          { name: "title", label: "Title", type: "text" },
          { name: "bgImage", label: "Background Image URL", type: "image" },
          {
            name: "steps",
            label: "Steps List",
            type: "array",
            fields: [
              { name: "num", label: "Number", type: "text" },
              { name: "title", label: "Title", type: "text" },
              { name: "desc", label: "Description", type: "textarea" },
            ]
          }
        ]
      }
    ]
  },
  {
    name: "industries",
    label: "Industries Section",
    type: "accordion",
    fields: [
      {
        name: "industries",
        label: "Industries Details",
        type: "object",
        fields: [
          { name: "badge", label: "Badge", type: "text" },
          { name: "title", label: "Title", type: "text" },
          { name: "description", label: "Description", type: "textarea" },
          { name: "cta", label: "CTA Button", type: "url" },
          {
            name: "list",
            label: "Industries List",
            type: "array",
            fields: [
              { name: "title", label: "Title", type: "text" },
              { name: "desc", label: "Description", type: "textarea" },
            ]
          }
        ]
      }
    ]
  },
  {
    name: "technologies",
    label: "Technologies Section",
    type: "accordion",
    fields: [
      {
        name: "technologies",
        label: "Technologies Details",
        type: "object",
        fields: [
          { name: "badge", label: "Badge", type: "text" },
          { name: "title", label: "Title", type: "text" },
          {
            name: "list",
            label: "Tech List",
            type: "array",
            fields: [
              { name: "icon", label: "Technology Logo", type: "image" },
              { name: "name", label: "Name", type: "text" },
              { name: "desc", label: "Description", type: "textarea" },
            ]
          }
        ]
      }
    ]
  },
  {
    name: "productsGroup",
    label: "Products",
    type: "accordion",
    fields: [
      {
        name: "productsSection",
        label: "Products Header Details",
        type: "object",
        fields: [
          { name: "badge", label: "Badge", type: "text" },
          { name: "title", label: "Title", type: "text" },
          { name: "description", label: "Description", type: "textarea" },
        ]
      },
      {
        name: "ysProducts",
        label: "Products List",
        type: "array",
        fields: [
          { name: "title", label: "Title", type: "text" },
          { name: "desc", label: "Description", type: "textarea" },
          { name: "badge", label: "Badge", type: "text" },
          { name: "logo", label: "Logo URL", type: "image" },
          { name: "headline", label: "Headline", type: "text" },
          { name: "text", label: "Text", type: "textarea" },
          { name: "img", label: "Image URL", type: "image" },
        ]
      }
    ]
  },
  {
    name: "testimonialsGroup",
    label: "Testimonials",
    type: "accordion",
    fields: [
      {
        name: "testimonialsSection",
        label: "Testimonials Header Details",
        type: "object",
        fields: [
          { name: "badge", label: "Badge", type: "text" },
          { name: "title", label: "Title", type: "text" },
          { name: "description", label: "Description", type: "textarea" },
        ]
      },
      {
        name: "testimonials",
        label: "Testimonial Items",
        type: "array",
        fields: [
          { name: "name", label: "Name", type: "text" },
          { name: "role", label: "Role", type: "text" },
          { name: "quote", label: "Quote", type: "textarea" },
        ]
      }
    ]
  },
  {
    name: "whyChooseUs",
    label: "Why Choose Us",
    type: "accordion",
    fields: [
      {
        name: "whyChooseUs",
        label: "Advantage Details",
        type: "object",
        fields: [
          { name: "badge", label: "Badge", type: "text" },
          { name: "title", label: "Title", type: "text" },
          { name: "description", label: "Description", type: "textarea" },
          { name: "bgImage", label: "Background Image URL", type: "image" },
          { name: "rightImage", label: "Right Image URL", type: "image" },
          {
            name: "features",
            label: "Features List",
            type: "array",
            fields: [
              { name: "title", label: "Title", type: "text" },
              { name: "desc", label: "Description", type: "textarea" },
            ]
          }
        ]
      }
    ]
  },
  {
    name: "connect",
    label: "Let's Connect",
    type: "accordion",
    fields: [
      {
        name: "connect",
        label: "Connect Details",
        type: "object",
        fields: [
          { name: "badge", label: "Badge", type: "text" },
          { name: "title", label: "Title", type: "text" },
          { name: "titleHighlight", label: "Title Highlight (Orange)", type: "text" },
          { name: "description", label: "Description", type: "textarea" },
          { name: "image", label: "Container Image URL", type: "image" },
          { name: "cta", label: "Primary CTA Button", type: "url" },
          { name: "secondaryCta", label: "Secondary CTA Button", type: "url" },
        ]
      }
    ]
  },
  {
    name: "faqs",
    label: "FAQs Section",
    type: "accordion",
    fields: [
      {
        name: "faqs",
        label: "FAQs Details",
        type: "object",
        fields: [
          { name: "badge", label: "Badge", type: "text" },
          { name: "title", label: "Title", type: "text" },
          { name: "graphicImage", label: "Graphic Image URL", type: "image" },
          { name: "graphicTitleLine1", label: "Graphic Text Line 1", type: "text" },
          { name: "graphicTitleLine2", label: "Graphic Text Line 2", type: "text" },
          { name: "graphicTitleLine3", label: "Graphic Text Line 3", type: "text" },
          { name: "graphicTitleLine4", label: "Graphic Text Line 4", type: "text" },
          {
            name: "list",
            label: "FAQ Items",
            type: "array",
            fields: [
              { name: "question", label: "Question", type: "text" },
              { name: "answer", label: "Answer", type: "textarea" },
            ]
          }
        ]
      }
    ]
  }
];
