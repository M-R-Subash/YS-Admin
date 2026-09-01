import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/zoro_cms?sslmode=disable" });
const prisma = new PrismaClient({ adapter });

async function main() {
  const contactContent = {
    hero: {
      badge: "Chat With Our Team",
      title: "Let's Build Something",
      highlight: "Exceptional Together.",
      description: "Got a question, need advice, or ready to start your next big digital project? The YS Innovations team is here to help."
    },
    contactCards: {
      phone: "+91-8778900553",
      phoneDescription: "Call us for immediate assistance.",
      email: "team@ysinnovations.com",
      emailDescription: "Drop us a line anytime.",
      location: "Ekta Plaza, Coimbatore",
      locationDescription: "Walk-ins welcome Mon-Sat."
    },
    formSection: {
      title: "Tell Us About Your Project",
      description: "Fill out the details below to receive a free consultation and quote.",
      image: {
        url: "https://res.cloudinary.com/subash-cms/image/upload/v1787243108/placeholder.png",
        alt: "YS Innovations Support Team"
      },
      imageTitle: "Ready to Transform Your Business?",
      imageDescription: "Tell us about your project vision, timeline, and goals. We'll assemble the ideal engineering and design team for you."
    },
    services: [
      { label: "Web Design & Development", detail: "Business websites, eCommerce, Shopify" },
      { label: "Mobile App Development", detail: "iOS & Android native/cross-platform" },
      { label: "UI/UX & Graphic Design", detail: "Figma wireframing, branding & assets" },
      { label: "Digital Marketing & SEO", detail: "Google/Meta Ads & organic ranking" },
      { label: "Custom Software Development", detail: "SaaS, portals & backend systems" }
    ],
    trustSignals: {
      title: "Why Work With YS Innovations?",
      description: "Data-backed strategies and engineered excellence for scaling brands.",
      items: [
        {
          title: "On-Time Delivery",
          description: "Strict adherence to project timelines and milestones."
        },
        {
          title: "Creative Solutions",
          description: "Modern, tailored approaches designed specifically for your brand."
        },
        {
          title: "Dedicated Support",
          description: "Long-term partnerships, updates, and ongoing maintenance."
        },
        {
          title: "Results Driven",
          description: "Data-backed strategies engineered to scale your revenue."
        }
      ]
    },
    locationSection: {
      title: "Our Headquarters",
      description: "Find us in Coimbatore or visit our office for a face-to-face consultation.",
      mapImage: {
        url: "https://res.cloudinary.com/subash-cms/image/upload/v1787243108/placeholder.png",
        alt: "Ekta Plaza Coimbatore Location Map"
      },
      address: "Ekta Plaza, 1st Floor, Indira Garden Road, Sakkarai Chettiyar Colony, Uppilipalayam, Coimbatore - 641015, Tamil Nadu.",
      hours: "Mon – Sat: 9:30 AM to 6:30 PM"
    },
    faqs: {
      badge: "FREQUENTLY ASKED QUESTIONS",
      title: "Common Questions & Answers",
      graphicImage: "https://res.cloudinary.com/subash-cms/image/upload/v1787243108/placeholder.png",
      graphicTitleLine1: "LET'S BUILD",
      graphicTitleLine2: "SOMETHING",
      graphicTitleLine3: "EXCEPTIONAL",
      graphicTitleLine4: "TOGETHER",
      list: [
        {
          question: "Do you offer free consultations?",
          answer: "Yes, our team provides a free initial consultation and a customized quotation tailored to your project requirements."
        },
        {
          question: "What platforms do you work with?",
          answer: "We specialize in Next.js, React, WordPress, Shopify, custom Node.js/PHP backends, and cross-platform mobile apps."
        },
        {
          question: "How long does a typical web or software project take?",
          answer: "Standard business websites take 2 to 4 weeks, while complex web applications or mobile apps take 6 to 12 weeks depending on scope."
        },
        {
          question: "Do you provide ongoing support and maintenance?",
          answer: "Yes, we offer long-term support, security updates, feature enhancements, and server management for all completed projects."
        }
      ]
    }
  };

  const contactPage = await prisma.page.upsert({
    where: { slug: "/contact" },
    update: {
      title: "Contact Us",
      status: "published",
      content: contactContent,
    },
    create: {
      title: "Contact Us",
      slug: "/contact",
      status: "published",
      content: contactContent,
    },
  });

  console.log("Successfully seeded Contact Us page to local database:", contactPage.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
