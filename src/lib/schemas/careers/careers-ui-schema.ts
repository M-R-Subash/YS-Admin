import type { FieldSchema } from "@/lib/schemas/global-schema";

export const careersUiSchema: FieldSchema[] = [
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
          { name: "highlight", label: "Highlight", type: "text" },
          { name: "description", label: "Description", type: "textarea" },
          { name: "cta", label: "Primary CTA Button", type: "url" },
          { name: "image", label: "Hero Image URL", type: "image" }
        ]
      }
    ]
  },
  {
    name: "marquee",
    label: "Marquee Section",
    type: "accordion",
    fields: [
      {
        name: "marquee",
        label: "Marquee Details",
        type: "object",
        fields: [
          {
            name: "departments",
            label: "Marquee Departments",
            type: "array",
            fields: [
              { name: "name", label: "Department Name", type: "text" }
            ]
          }
        ]
      }
    ]
  },
  {
    name: "whyHere",
    label: "Why Build Your Career Here?",
    type: "accordion",
    fields: [
      {
        name: "whyHere",
        label: "Why Here Details",
        type: "object",
        fields: [
          { name: "badge", label: "Badge", type: "text" },
          { name: "title", label: "Title", type: "text" },
          { name: "highlight", label: "Highlight", type: "text" },
          { name: "description", label: "Description", type: "textarea" },
          { name: "image", label: "Background Image URL", type: "image" },
          {
            name: "features",
            label: "Features List",
            type: "array",
            fields: [
              { name: "number", label: "Number", type: "text" },
              { name: "title", label: "Title", type: "text" },
              { name: "description", label: "Description", type: "textarea" },
            ]
          }
        ]
      }
    ]
  },
  {
    name: "openPositions",
    label: "Open Positions Section",
    type: "accordion",
    fields: [
      {
        name: "openPositions",
        label: "Open Positions Details",
        type: "object",
        fields: [
          { name: "badge", label: "Badge", type: "text" },
          { name: "title", label: "Title", type: "text" },
          { name: "highlight", label: "Highlight", type: "text" },
          {
            name: "jobs",
            label: "Jobs List",
            type: "array",
            fields: [
              { name: "title", label: "Job Title", type: "text" },
              { name: "description", label: "Description", type: "textarea" },
              { name: "location", label: "Location", type: "text" },
              { name: "experience", label: "Experience", type: "text" },
              { name: "type", label: "Type", type: "text" },
              { name: "link", label: "Apply Link", type: "url" },
            ]
          }
        ]
      }
    ]
  },
  {
    name: "realPeople",
    label: "Real People Gallery",
    type: "accordion",
    fields: [
      {
        name: "realPeople",
        label: "Real People Details",
        type: "object",
        fields: [
          { name: "badge", label: "Badge", type: "text" },
          { name: "title", label: "Title", type: "text" },
          { name: "highlight", label: "Highlight", type: "text" },
          { name: "description", label: "Description", type: "textarea" },
          { name: "image1", label: "Left Tall Image URL", type: "image" },
          { name: "image2", label: "Right Top Image URL", type: "image" },
          { name: "image3", label: "Right Bottom Image URL", type: "image" },
          { name: "image4", label: "Bottom Wide Image URL", type: "image" },
        ]
      }
    ]
  },
  {
    name: "testimonialsSection",
    label: "Testimonials Section",
    type: "accordion",
    fields: [
      {
        name: "testimonialsSection",
        label: "Testimonials Details",
        type: "object",
        fields: [
          { name: "badge", label: "Badge", type: "text" },
          { name: "title", label: "Title", type: "text" },
          { name: "highlight", label: "Highlight", type: "text" },
          {
            name: "testimonials",
            label: "Testimonials List",
            type: "array",
            fields: [
              { name: "quote", label: "Quote", type: "textarea" },
              { name: "name", label: "Person Name", type: "text" },
              { name: "role", label: "Person Role", type: "text" },
              { name: "avatar", label: "Avatar URL", type: "image" },
            ]
          }
        ]
      }
    ]
  },
  {
    name: "faqs",
    label: "FAQ Section",
    type: "accordion",
    fields: [
      {
        name: "faqs",
        label: "FAQ Details",
        type: "object",
        fields: [
          { name: "badge", label: "Badge", type: "text" },
          { name: "title", label: "Title", type: "text" },
          { name: "graphicTitleLine1", label: "Graphic Text Line 1", type: "text" },
          { name: "graphicTitleLine2", label: "Graphic Text Line 2", type: "text" },
          { name: "graphicTitleLine3", label: "Graphic Text Line 3", type: "text" },
          { name: "graphicTitleLine4", label: "Graphic Text Line 4", type: "text" },
          { name: "graphicImage", label: "Graphic Image URL", type: "image" },
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
