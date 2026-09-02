import type { FieldSchema } from "@/lib/schemas/global-schema";

export const servicesUiSchema: FieldSchema[] = [
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
          { name: "titleHighlight", label: "Title Highlight (Orange)", type: "text" },
          { name: "description", label: "Description", type: "textarea" },
          { name: "tags", label: "Pill Tags (comma separated)", type: "tags" },
          { name: "cta", label: "Primary CTA Button", type: "url" },
          { name: "secondaryCta", label: "Secondary CTA Button", type: "url" },
          { name: "image", label: "Hero Side Image", type: "image" },
        ],
      },
    ],
  },
  {
    name: "whyItMatters",
    label: "Why It Matters Section",
    type: "accordion",
    fields: [
      {
        name: "whyItMatters",
        label: "Why It Matters Details",
        type: "object",
        fields: [
          { name: "badge", label: "Badge", type: "text" },
          { name: "title", label: "Title", type: "text" },
          { name: "description", label: "Description", type: "textarea" },
          { name: "image", label: "Side Image", type: "image" },
          {
            name: "metrics",
            label: "Metrics Cards",
            type: "array",
            fields: [
              { name: "stat", label: "Stat / Number", type: "text" },
              { name: "title", label: "Metric Title", type: "text" },
              { name: "desc", label: "Metric Description", type: "textarea" },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "fullStackEngine",
    label: "Full-Stack Engine & Layers",
    type: "accordion",
    fields: [
      {
        name: "fullStackEngine",
        label: "Full-Stack Engine Details",
        type: "object",
        fields: [
          { name: "badge", label: "Badge", type: "text" },
          { name: "title", label: "Title", type: "text" },
          { name: "description", label: "Description", type: "textarea" },
          {
            name: "services",
            label: "Service Grid Cards",
            type: "array",
            fields: [
              { name: "title", label: "Service Title", type: "text" },
              { name: "desc", label: "Service Description", type: "textarea" },
            ],
          },
          { name: "layersBadge", label: "Layers Badge", type: "text" },
          { name: "layersTitle", label: "Layers Title", type: "text" },
          {
            name: "layers",
            label: "4 Layers List",
            type: "array",
            fields: [
              { name: "num", label: "Layer Number (e.g. 01)", type: "text" },
              { name: "title", label: "Layer Title", type: "text" },
              { name: "desc", label: "Layer Description", type: "textarea" },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "processSection",
    label: "Process & Outcomes Section",
    type: "accordion",
    fields: [
      {
        name: "processSection",
        label: "Process Details",
        type: "object",
        fields: [
          { name: "badge", label: "Badge", type: "text" },
          { name: "title", label: "Title", type: "text" },
          { name: "description", label: "Description", type: "textarea" },
          {
            name: "steps",
            label: "Process Steps (6 Cards)",
            type: "array",
            fields: [
              { name: "num", label: "Step Number (e.g. 01)", type: "text" },
              { name: "title", label: "Step Title", type: "text" },
              { name: "desc", label: "Step Description", type: "textarea" },
            ],
          },
          { name: "outcomesBadge", label: "Outcomes Badge", type: "text" },
          { name: "outcomesTitle", label: "Outcomes Title", type: "text" },
          { name: "outcomesDescription", label: "Outcomes Description", type: "textarea" },
          {
            name: "outcomes",
            label: "Outcomes Grid (8 Cards)",
            type: "array",
            fields: [
              { name: "stat", label: "Stat / Number", type: "text" },
              { name: "title", label: "Outcome Title", type: "text" },
              { name: "desc", label: "Outcome Description", type: "textarea" },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "caseStudiesSection",
    label: "Case Studies & Strategy Section",
    type: "accordion",
    fields: [
      {
        name: "caseStudiesSection",
        label: "Case Studies Details",
        type: "object",
        fields: [
          { name: "badge", label: "Badge", type: "text" },
          { name: "title", label: "Title", type: "text" },
          { name: "titleHighlight", label: "Title Highlight (Orange)", type: "text" },
          { name: "description", label: "Description", type: "textarea" },
          {
            name: "items",
            label: "Featured Case Studies Cards",
            type: "array",
            fields: [
              { name: "category", label: "Category / Tag", type: "text" },
              { name: "title", label: "Title", type: "text" },
              { name: "desc", label: "Description", type: "textarea" },
              { name: "tags", label: "Tags (comma separated)", type: "tags" },
              { name: "stat1", label: "Stat 1 Number", type: "text" },
              { name: "label1", label: "Stat 1 Label", type: "text" },
              { name: "stat2", label: "Stat 2 Number", type: "text" },
              { name: "label2", label: "Stat 2 Label", type: "text" },
              { name: "image", label: "Case Study Image", type: "image" },
            ],
          },
          { name: "strategyBadge", label: "Strategy Badge", type: "text" },
          { name: "strategyTitleLine1", label: "Strategy Title Line 1", type: "text" },
          { name: "strategyTitleLine2", label: "Strategy Title Line 2", type: "text" },
          { name: "strategyTitleHighlight", label: "Strategy Title Highlight (Orange)", type: "text" },
          {
            name: "strategyPoints",
            label: "Strategy Points Accordion (7 Items)",
            type: "array",
            fields: [
              { name: "num", label: "Number (e.g. 01)", type: "text" },
              { name: "title", label: "Point Title", type: "text" },
              { name: "desc", label: "Point Description", type: "textarea" },
              { name: "footerTag", label: "Footer Badge Text", type: "text" },
            ],
          },
          { name: "assuranceBadge", label: "Assurance Badge", type: "text" },
          { name: "assuranceTitle", label: "Assurance Title", type: "text" },
          { name: "assuranceHighlight", label: "Assurance Title Highlight (Orange)", type: "text" },
          { name: "assuranceDescription", label: "Assurance Description", type: "textarea" },
          { name: "assuranceImage", label: "Assurance Image", type: "image" },
        ],
      },
    ],
  },
  {
    name: "whoWeAreSection",
    label: "Who We Are Section",
    type: "accordion",
    fields: [
      {
        name: "whoWeAreSection",
        label: "Who We Are Details",
        type: "object",
        fields: [
          { name: "badge", label: "Badge", type: "text" },
          { name: "title", label: "Title Line 1", type: "text" },
          { name: "titleHighlight", label: "Title Highlight (Orange)", type: "text" },
          { name: "titleEnd", label: "Title End Text", type: "text" },
          { name: "description", label: "Description", type: "textarea" },
          { name: "cta", label: "Primary CTA Button", type: "url" },
          { name: "secondaryCta", label: "Secondary CTA Button", type: "url" },
          { name: "image", label: "Side Image", type: "image" },
          {
            name: "metrics",
            label: "Metrics Cards (4 Items)",
            type: "array",
            fields: [
              { name: "stat", label: "Stat / Number", type: "text" },
              { name: "title", label: "Title", type: "text" },
              { name: "desc", label: "Description", type: "textarea" },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "problemsSection",
    label: "Business Challenges Section",
    type: "accordion",
    fields: [
      {
        name: "problemsSection",
        label: "Business Challenges Details",
        type: "object",
        fields: [
          { name: "badge", label: "Badge", type: "text" },
          { name: "title", label: "Title", type: "text" },
          { name: "titleHighlight", label: "Title Highlight (Orange)", type: "text" },
          { name: "description", label: "Description", type: "textarea" },
          { name: "image", label: "Main Image", type: "image" },
          {
            name: "cards",
            label: "Problem Cards",
            type: "array",
            fields: [
              { name: "title", label: "Card Title", type: "text" },
              { name: "desc", label: "Card Description", type: "textarea" },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "perspectivesSection",
    label: "Perspectives & Insights Section",
    type: "accordion",
    fields: [
      {
        name: "perspectivesSection",
        label: "Perspectives Details",
        type: "object",
        fields: [
          { name: "badge", label: "Badge", type: "text" },
          { name: "title", label: "Title", type: "text" },
          { name: "titleHighlight", label: "Title Highlight (Orange)", type: "text" },
          {
            name: "cards",
            label: "Insight Cards (3 Items)",
            type: "array",
            fields: [
              { name: "category", label: "Category Tag", type: "text" },
              { name: "title", label: "Article Title", type: "text" },
              { name: "readTime", label: "Read Time (e.g. 8 min read)", type: "text" },
              { name: "image", label: "Article Image", type: "image" },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "faqsSection",
    label: "FAQ Section",
    type: "accordion",
    fields: [
      {
        name: "faqsSection",
        label: "FAQ Section Details",
        type: "object",
        fields: [
          { name: "badge", label: "Badge", type: "text" },
          { name: "title", label: "Title", type: "text" },
          { name: "graphicImage", label: "Graphic Card Image", type: "image" },
          { name: "graphicTitleLine1", label: "Graphic Text Line 1", type: "text" },
          { name: "graphicTitleLine2", label: "Graphic Text Line 2", type: "text" },
          { name: "graphicTitleLine3", label: "Graphic Text Line 3", type: "text" },
          { name: "graphicTitleLine4", label: "Graphic Text Line 4", type: "text" },
          {
            name: "list",
            label: "FAQ List",
            type: "array",
            fields: [
              { name: "question", label: "Question", type: "text" },
              { name: "answer", label: "Answer", type: "textarea" },
            ],
          },
        ],
      },
    ],
  },
];
