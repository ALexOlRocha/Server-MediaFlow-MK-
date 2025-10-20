// scripts/test-images.js
import { PrismaClient } from "@prisma/client";
import { writeFileSync, existsSync, mkdirSync } from "fs";

const prisma = new PrismaClient();

async function testImages() {
  try {
    console.log("🖼️ Testando imagens salvas...\n");

    // Buscar todas as imagens
    const imageFiles = await prisma.file.findMany({
      where: {
        mimeType: {
          startsWith: "image/",
        },
      },
    });

    console.log(`📸 Imagens encontradas: ${imageFiles.length}\n`);

    // Criar pasta para exportar imagens de teste
    const testDir = "./test-images";
    if (!existsSync(testDir)) {
      mkdirSync(testDir);
    }

    for (const file of imageFiles) {
      console.log(`🔍 Analisando: ${file.name}`);
      console.log(`   Tipo: ${file.mimeType}`);
      console.log(`   Tamanho: ${file.size} bytes`);
      console.log(
        `   Dados: ${file.data ? file.data.length + " bytes" : "NULO"}`
      );
      console.log(`   Pasta: ${file.folderId || "Nenhuma"}`);

      // Tentar salvar a imagem para testar
      if (file.data && file.data.length > 0) {
        try {
          const buffer = Buffer.isBuffer(file.data)
            ? file.data
            : Buffer.from(file.data);
          const filename = `${testDir}/test-${file.id}-${file.name}`;
          writeFileSync(filename, buffer);
          console.log(`   ✅ Salvo em: ${filename}`);
        } catch (saveError) {
          console.log(`   ❌ Erro ao salvar: ${saveError.message}`);
        }
      } else {
        console.log(`   ⚠️  Sem dados para salvar`);
      }
      console.log("---");
    }
  } catch (error) {
    console.error("❌ Erro no teste:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testImages();
