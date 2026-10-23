import { getPrismaClient } from "./repositories/client.js";

const prisma = getPrismaClient();
const targetEmail = "ethanellahmatara@gmail.com";

async function main() {
  if (!prisma) {
    throw new Error("DATABASE_URL is required to update the administrator role.");
  }

  const existingUser = await prisma.user.findUnique({
    where: {
      email: targetEmail,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  });

  if (!existingUser) {
    console.error("No account exists for:", targetEmail);
    console.error(
      "Register this email through the normal registration page first, then run this script again."
    );
    process.exitCode = 1;
    return;
  }

  const updatedUser = await prisma.user.update({
    where: {
      id: existingUser.id,
    },
    data: {
      role: "SUPER_ADMIN",
      isActive: true,
    },
    select: {
      name: true,
      email: true,
      role: true,
      isActive: true,
    },
  });

  console.log("Administrator role updated successfully:");
  console.table([updatedUser]);
}

try {
  await main();
} catch (error) {
  console.error("Unable to update the administrator role:", error.message);
  process.exitCode = 1;
} finally {
  if (prisma) {
    await prisma.$disconnect();
  }
}