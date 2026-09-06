import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Role } from "../src/generated/prisma/client";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not defined in environment.");
  process.exit(1);
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  // 1. Seed Admin User
  const adminEmail = (process.env.ADMIN_SEED_EMAIL || "admin@ys.com").toLowerCase();
  const adminPassword = process.env.ADMIN_SEED_PASSWORD || "admin123";

  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash(adminPassword, 12);
    await prisma.user.create({
      data: {
        email: adminEmail,
        name: "Super Admin",
        password: hashedPassword,
        role: Role.ADMIN,
      },
    });
    console.log(`Created default admin user: ${adminEmail}`);
  } else {
    console.log(`Admin user already exists: ${adminEmail}`);
  }

  // 2. Seed Default Global Header
  const existingHeader = await prisma.header.findUnique({
    where: { id: "global" },
  });

  if (!existingHeader) {
    await prisma.header.create({
      data: {
        id: "global",
        content: {
          logo: { url: "/logo.png", alt: "YS Innovations" },
          ctaButton: { text: "Get Started", url: "/contact", newTab: false, noFollow: false },
          navItems: [
            { id: "1", label: "Home", url: { url: "/", newTab: false, noFollow: false } },
            { id: "2", label: "Careers", url: { url: "/careers", newTab: false, noFollow: false } },
            { id: "3", label: "Blogs", url: { url: "/blogs", newTab: false, noFollow: false } },
            { id: "4", label: "Contact", url: { url: "/contact", newTab: false, noFollow: false } },
          ],
        },
      },
    });
    console.log("Created default global Header");
  }

  // 3. Seed Default Global Footer
  const existingFooter = await prisma.footer.findUnique({
    where: { id: "global" },
  });

  if (!existingFooter) {
    await prisma.footer.create({
      data: {
        id: "global",
        content: {
          cta: {
            title: "Let's build something extraordinary together.",
            button: { text: "Start a Conversation", url: "/contact", newTab: false, noFollow: false },
            image: { url: "/placeholder.png", alt: "Footer CTA" },
          },
          socialLinks: [],
          newsletter: { title: "Stay Ahead", highlight: "with industry insights" },
          columns: [],
          contact: {
            address: { text: "Bengaluru, India", url: "#" },
            phone: { text: "+91 98765 43210", url: "tel:+919876543210" },
            email: { text: "contact@ysinnovations.com", url: "mailto:contact@ysinnovations.com" },
          },
          backgroundImage: { url: "/placeholder.png", alt: "Footer Background" },
          copyright: `© ${new Date().getFullYear()} YS Innovations. All rights reserved.`,
          policyLinks: [],
        },
      },
    });
    console.log("Created default global Footer");
  }

  // 4. Seed Homepage Page record if missing
  const homePage = await prisma.page.findUnique({
    where: { slug: "/" },
  });

  if (!homePage) {
    await prisma.page.create({
      data: {
        title: "Home",
        slug: "/",
        status: "published",
        content: {
          hero: {
            title: "Innovate Today, Lead Tomorrow",
            badge: "Top Rated Agency",
            description: "Empowering businesses through cutting-edge technology and human-centric design.",
            ctaPrimaryText: "Get In Touch",
            ctaPrimaryLink: "/contact",
          },
        },
      },
    });
    console.log("Created default Home page");
  }

  console.log("Seeding complete.");
}

main()
  .catch((e) => {
    console.error("Seeding error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
