import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  await prisma.user.create({
    data: {
      name: "Usuário Padrão",
      email: "default@mediamanager.com",
      password: "senha123",
    },
  });
}

main()
  .then(() => console.log("Usuário padrão criado"))
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
