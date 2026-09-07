import prisma from "@/lib/prisma";
import FooterEditorClient from "./FooterEditorClient";

export default async function FooterPage() {
  const footer = await prisma.footer.findUnique({
    where: { id: "global" },
  });

  const defaultData = {
    cta: {
      title: "Let's Build Future Together.",
      button: {
        text: "Get In Touch",
        url: "/contact",
        newTab: false,
        noFollow: false,
      },
      image: { url: "", alt: "" },
    },
    columns: [
      {
        title: "Resources",
        links: [
          { text: "Our Products", url: "/our-products", newTab: false, noFollow: false },
          { text: "About Us", url: "/about-us", newTab: false, noFollow: false },
          { text: "Careers", url: "/careers", newTab: false, noFollow: false },
          { text: "Blog", url: "/blogs", newTab: false, noFollow: false },
          { text: "Our Story", url: "/our-story", newTab: false, noFollow: false },
        ],
      },
      {
        title: "Services",
        links: [
          { text: "SEO", url: "/seo", newTab: false, noFollow: false },
          { text: "Graphic Design & Branding", url: "/graphic-design-branding", newTab: false, noFollow: false },
          { text: "Ecommerce Solution", url: "/ecommerce-solution", newTab: false, noFollow: false },
          { text: "Web design and development", url: "/web-design-and-development", newTab: false, noFollow: false },
          { text: "Digital Marketing", url: "/digital-marketing", newTab: false, noFollow: false },
        ],
      },
    ],
    contact: {
      email: {
        text: "team@ysinnovations.com",
        url: "mailto:team@ysinnovations.com",
        newTab: false,
        noFollow: false,
      },
      phone: {
        text: "+91-8778900553",
        url: "tel:+918778900553",
        newTab: false,
        noFollow: false,
      },
      address: {
        text: "Ekta Plaza, Indira Garden Road, Uppilipalayam, Coimbatore – 641015",
        url: "https://maps.app.goo.gl/mi5NMsi5QnnwW8YDA",
        newTab: true,
        noFollow: false,
      },
    },
    copyright: `YSInnovations © ${new Date().getFullYear()}. All right reserved.`,
    newsletter: {
      title: "Subscribe to Our",
      highlight: "Newsletter",
    },
    policyLinks: [
      { text: "Privacy & Policy", url: "/privacy-policy", newTab: false, noFollow: false },
      { text: "Terms & Condition", url: "/terms-and-conditions", newTab: false, noFollow: false },
    ],
    socialLinks: [
      { text: "facebook", url: "https://www.facebook.com/ysinnovations", newTab: true, noFollow: false },
      { text: "x", url: "https://x.com/ysinnovations", newTab: true, noFollow: false },
      { text: "instagram", url: "https://www.instagram.com/ysinnovations/", newTab: true, noFollow: false },
      { text: "linkedin", url: "https://www.linkedin.com/company/ysinnovations", newTab: true, noFollow: false },
    ],
    backgroundImage: { url: "", alt: "" },
  };

  const initialData = footer ? footer.content : defaultData;

  return <FooterEditorClient initialData={initialData as any} />;
}
