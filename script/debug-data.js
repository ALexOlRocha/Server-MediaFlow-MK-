// scripts/debug-data.js
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function debugData() {
  try {
    console.log("🔍 Debugando dados do banco...\n");

    // Verificar usuários
    const users = await prisma.user.findMany({
      include: {
        folders: true,
        files: true,
      },
    });
    console.log("👥 Usuários:", users.length);
    users.forEach((user) => {
      console.log(`   - ${user.name} (${user.email})`);
      console.log(
        `     Pastas: ${user.folders.length}, Arquivos: ${user.files.length}`
      );
    });

    // Verificar pastas
    const folders = await prisma.folder.findMany({
      include: {
        children: true,
        files: true,
        parent: true,
      },
    });
    console.log("\n📁 Pastas:", folders.length);
    folders.forEach((folder) => {
      console.log(`   - "${folder.name}" (ID: ${folder.id})`);
      console.log(
        `     Subpastas: ${folder.children.length}, Arquivos: ${folder.files.length}`
      );
      console.log(`     Pai: ${folder.parent?.name || "Raiz"}`);
    });

    // Verificar arquivos
    const files = await prisma.file.findMany({
      include: {
        folder: true,
      },
    });
    console.log("\n📄 Arquivos:", files.length);
    files.forEach((file) => {
      console.log(`   - "${file.name}" (${file.mimeType})`);
      console.log(`     Pasta: ${file.folder?.name || "Nenhuma"}`);
    });
  } catch (error) {
    console.error("❌ Erro no debug:", error);
  } finally {
    await prisma.$disconnect();
  }
}

debugData();
