import prisma from "@/lib/prisma";
import HeaderEditorClient from "./HeaderEditorClient";

export default async function HeaderPage() {
  const header = await prisma.header.findUnique({
    where: { id: "global" },
  });

  const defaultData = {
    logo: {
      alt: "YS Innovations",
      url: "https://res.cloudinary.com/subash-cms/image/upload/v1788346719/image-8.png",
      title: "YS Innovations",
    },
    ctaButton: {
      text: "Get Started",
      url: "/contact",
      newTab: false,
      noFollow: false,
    },
    navItems: [
      {
        id: "1",
        label: "Home",
        url: { url: "/", newTab: false, noFollow: false },
        subItems: [],
      },
      {
        id: "2",
        label: "Our Services",
        url: { url: "#services", newTab: false, noFollow: false },
        subItems: [
          { label: "Digital Marketing", url: { url: "/digital-marketing", newTab: false, noFollow: false } },
          { label: "App development", url: { url: "/app-development", newTab: false, noFollow: false } },
          { label: "Website development", url: { url: "/web-development", newTab: false, noFollow: false } },
          { label: "Wordpress development", url: { url: "/wordpress-development", newTab: false, noFollow: false } },
        ],
      },
      {
        id: "3",
        label: "Contact Us",
        url: { url: "/contact", newTab: false, noFollow: false },
        subItems: [],
      },
      {
        id: "4",
        label: "Careers",
        url: { url: "/careers", newTab: false, noFollow: false },
        subItems: [],
      },
      {
        id: "5",
        label: "Blog",
        url: { url: "/blogs", newTab: false, noFollow: false },
        subItems: [],
      },
    ],
  };

  const initialData = header ? header.content : defaultData;

  return <HeaderEditorClient initialData={initialData as any} />;
}
