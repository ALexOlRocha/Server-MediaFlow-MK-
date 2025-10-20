// scripts/create-default-user.js
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function createDefaultUser() {
  try {
    console.log("👤 Criando usuário padrão...");

    // Criar ou obter usuário padrão
    const user = await prisma.user.upsert({
      where: { email: "default@mediamanager.com" },
      update: {},
      create: {
        email: "default@mediamanager.com",
        name: "Usuário Padrão",
      },
    });

    console.log("✅ Usuário criado:", user);
    console.log("📋 ID do usuário:", user.id);
    console.log("\n💡 Use este ID no seu frontend:");
    console.log("NEXT_PUBLIC_DEFAULT_USER_ID=" + user.id);

    return user;
  } catch (error) {
    console.error("❌ Erro ao criar usuário:", error);
  } finally {
    await prisma.$disconnect();
  }
}

createDefaultUser();
