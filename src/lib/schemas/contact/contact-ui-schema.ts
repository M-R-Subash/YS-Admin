import type { FieldSchema } from "@/lib/schemas/global-schema";

export const contactUiSchema: FieldSchema[] = [
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
          { name: "highlight", label: "Highlight Text", type: "text" },
          { name: "description", label: "Description", type: "textarea" },
        ]
      }
    ]
  },
  {
    name: "contactCards",
    label: "Direct Contact Cards",
    type: "accordion",
    fields: [
      {
        name: "contactCards",
        label: "Contact Card Details",
        type: "object",
        fields: [
          { name: "phone", label: "Phone Number", type: "text" },
          { name: "phoneDescription", label: "Phone Description", type: "text" },
          { name: "email", label: "Email Address", type: "text" },
          { name: "emailDescription", label: "Email Description", type: "text" },
          { name: "location", label: "Headquarters Title", type: "text" },
          { name: "locationDescription", label: "Headquarters Subtitle", type: "text" },
        ]
      }
    ]
  },
  {
    name: "formSection",
    label: "Inquiry Form Section",
    type: "accordion",
    fields: [
      {
        name: "formSection",
        label: "Form Section Details",
        type: "object",
        fields: [
          { name: "title", label: "Section Title", type: "text" },
          { name: "description", label: "Section Description", type: "textarea" },
          { name: "image", label: "Side Support Image", type: "image" },
          { name: "imageTitle", label: "Card Image Title", type: "text" },
          { name: "imageDescription", label: "Card Image Description", type: "textarea" },
        ]
      }
    ]
  },
  {
    name: "services",
    label: "Services Offered",
    type: "accordion",
    fields: [
      {
        name: "services",
        label: "Service Chips List",
        type: "array",
        fields: [
          { name: "label", label: "Service Name", type: "text" },
          { name: "detail", label: "Service Details", type: "text" }
        ]
      }
    ]
  },
  {
    name: "trustSignals",
    label: "Why Choose YS Innovations",
    type: "accordion",
    fields: [
      {
        name: "trustSignals",
        label: "Trust Signals Details",
        type: "object",
        fields: [
          { name: "title", label: "Section Title", type: "text" },
          { name: "description", label: "Section Description", type: "textarea" },
          {
            name: "items",
            label: "Value Prop Cards",
            type: "array",
            fields: [
              { name: "title", label: "Card Title", type: "text" },
              { name: "description", label: "Card Description", type: "textarea" }
            ]
          }
        ]
      }
    ]
  },
  {
    name: "locationSection",
    label: "Headquarters Location",
    type: "accordion",
    fields: [
      {
        name: "locationSection",
        label: "Office Location Details",
        type: "object",
        fields: [
          { name: "title", label: "Section Title", type: "text" },
          { name: "description", label: "Section Description", type: "textarea" },
          { name: "mapImage", label: "Map Preview Image", type: "image" },
          { name: "address", label: "Full Physical Address", type: "textarea" },
          { name: "hours", label: "Working Hours", type: "text" }
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
          { name: "graphicTitleLine1", label: "Graphic Line 1", type: "text" },
          { name: "graphicTitleLine2", label: "Graphic Line 2", type: "text" },
          { name: "graphicTitleLine3", label: "Graphic Line 3", type: "text" },
          { name: "graphicTitleLine4", label: "Graphic Line 4", type: "text" },
          { name: "graphicImage", label: "Graphic Image URL", type: "image" },
          {
            name: "list",
            label: "FAQ List",
            type: "array",
            fields: [
              { name: "question", label: "Question", type: "text" },
              { name: "answer", label: "Answer", type: "textarea" }
            ]
          }
        ]
      }
    ]
  }
];
