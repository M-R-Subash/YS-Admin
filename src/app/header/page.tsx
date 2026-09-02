import prisma from "@/lib/prisma";
import HeaderEditorClient from "./HeaderEditorClient";

export default async function HeaderPage() {
  const header = await prisma.header.findUnique({
    where: { id: "global" },
  });

  const defaultData = {
    logo: { url: "/logo.png", alt: "YS Innovations" },
    ctaButton: { label: "Get Started", url: "#contact" },
    navItems: [{ id: "1", label: "Home", url: "/" }],
  };

  const initialData = header ? header.content : defaultData;

  return <HeaderEditorClient initialData={initialData as any} />;
}
