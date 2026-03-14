import "dotenv/config";
import { prisma } from "../lib/prisma";
import { hashPassword } from "../lib/auth";

async function main() {
  const loginEmail = "test@pecnot.it";
  const plainPassword = "Test12345!";
  const passwordHash = await hashPassword(plainPassword);

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 30);

  const studio = await prisma.studio.upsert({
    where: {
      loginEmail,
    },
    update: {
      studioName: "Studio Test PECNOT",
      passwordHash,
      licenseStatus: "active",
      billingCycle: "monthly",
      licenseStartsAt: now,
      licenseExpiresAt: expiresAt,
      notes: "Seed locale di test",
      lastSuccessfulCheckAt: now,
    },
    create: {
      studioName: "Studio Test PECNOT",
      loginEmail,
      passwordHash,
      licenseStatus: "active",
      billingCycle: "monthly",
      licenseStartsAt: now,
      licenseExpiresAt: expiresAt,
      notes: "Seed locale di test",
      lastSuccessfulCheckAt: now,
    },
  });

  console.log("Studio seed creato/aggiornato:", {
    id: studio.id,
    loginEmail,
    plainPassword,
  });
}

main()
  .catch((error) => {
    console.error("Seed error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });