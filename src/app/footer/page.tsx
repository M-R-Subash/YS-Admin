import prisma from "@/lib/prisma";
import FooterEditorClient from "./FooterEditorClient";

export default async function FooterPage() {
  const footer = await prisma.footer.findUnique({
    where: { id: "global" },
  });

  const initialData = footer ? footer.content : {};

  return <FooterEditorClient initialData={initialData as any} />;
}
