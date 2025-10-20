// scripts/testDb.js
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function testDatabase() {
  try {
    // Testar conexão
    await prisma.$connect();
    console.log("✅ Conectado ao banco de dados");

    // Criar usuário de teste se não existir
    const user = await prisma.user.upsert({
      where: { email: "test@example.com" },
      update: {},
      create: {
        email: "test@example.com",
        name: "Usuário Teste",
      },
    });
    console.log("✅ Usuário de teste criado:", user.id);

    // Criar pasta raiz de teste
    const folder = await prisma.folder.create({
      data: {
        name: "Pasta Teste",
        userId: user.id,
      },
    });
    console.log("✅ Pasta de teste criada:", folder.id);

    // Listar todos os usuários
    const users = await prisma.user.findMany();
    console.log("📋 Usuários encontrados:", users.length);

    // Listar todas as pastas
    const folders = await prisma.folder.findMany();
    console.log("📁 Pastas encontradas:", folders.length);

    // Listar veículos
    const veiculos = await prisma.veiculo.findMany();
    console.log("🚗 Veículos encontrados:", veiculos.length);
  } catch (error) {
    console.error("❌ Erro no teste:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testDatabase();
