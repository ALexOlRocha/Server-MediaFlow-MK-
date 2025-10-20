// routes/userRoutes.js - VERSÃO OTIMIZADA COM PAGINAÇÃO
import express from "express";
import { PrismaClient } from "@prisma/client";
import multer from "multer";
import JSZip from "jszip";

const prisma = new PrismaClient();

// CONFIGURAÇÕES ATUALIZADAS - LIMITES AUMENTADOS
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB para arquivos individuais
  },
});

const multiUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 1024 * 1024 * 1024, // 1GB para ZIPs
  },
});

const multiFilesUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB por arquivo
    files: 50, // até 50 arquivos por upload
  },
});

const router = express.Router();

// Middleware para obter usuário padrão
async function getDefaultUser() {
  return await prisma.user.findFirst({
    where: { email: "default@mediamanager.com" },
  });
}

// Função para determinar MIME type
function getMimeType(filename) {
  const ext = filename.toLowerCase().split(".").pop();
  const mimeTypes = {
    txt: "text/plain",
    pdf: "application/pdf",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    zip: "application/zip",
    mp3: "audio/mpeg",
    mp4: "video/mp4",
    avi: "video/x-msvideo",
    html: "text/html",
    css: "text/css",
    js: "application/javascript",
    json: "application/json",
  };
  return mimeTypes[ext] || "application/octet-stream";
}

// ========== ROTAS OTIMIZADAS ==========

// ROTA PAGINADA PARA PASTA ESPECÍFICA (SEM DADOS BINÁRIOS)
router.get("/folders/:id/content-paginated", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      page = 1,
      pageSize = 20,
      includeFiles = "true",
      includeChildren = "true",
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(pageSize);

    console.log(`📁 Buscando pasta ${id}, página ${page}, tamanho ${pageSize}`);

    //  BUSCAR APENAS METADADOS - NUNCA OS DADOS BINÁRIOS
    const folder = await prisma.folder.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        createdAt: true,
        _count: {
          select: {
            files: true,
            children: true,
          },
        },
      },
    });

    if (!folder) {
      return res.status(404).json({ error: "Pasta não encontrada" });
    }

    const result = {
      folder: {
        id: folder.id,
        name: folder.name,
        createdAt: folder.createdAt,
      },
      pagination: {
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        totalFiles: folder._count.files,
        totalChildren: folder._count.children,
        totalPages: Math.ceil(folder._count.files / parseInt(pageSize)),
      },
      files: [],
      children: [],
    };

    // CARREGAR ARQUIVOS PAGINADOS (SEM DADOS BINÁRIOS)
    if (includeFiles === "true") {
      const files = await prisma.file.findMany({
        where: { folderId: id },
        select: {
          id: true,
          name: true,
          mimeType: true,
          size: true,
          path: true,
          createdAt: true,
        },
        skip: skip,
        take: parseInt(pageSize),
        orderBy: { createdAt: "desc" },
      });

      result.files = files;
      console.log(`📄 Carregados ${files.length} arquivos (página ${page})`);
    }

    // CARREGAR SUBPASTAS (SEM CONTEÚDO RECURSIVO)
    if (includeChildren === "true") {
      const children = await prisma.folder.findMany({
        where: { parentId: id },
        select: {
          id: true,
          name: true,
          createdAt: true,
          _count: {
            select: {
              files: true,
              children: true,
            },
          },
        },
        orderBy: { name: "asc" },
      });

      result.children = children;
      console.log(`📂 Carregadas ${children.length} subpastas`);
    }

    res.json(result);
  } catch (error) {
    console.error("❌ Erro ao buscar conteúdo paginado:", error);
    res.status(500).json({ error: "Erro ao buscar conteúdo da pasta" });
  }
});

// ROTA LEVE PARA PASTA (SEM ARQUIVOS BINÁRIOS)
router.get("/folders/:id/light", async (req, res) => {
  try {
    const { id } = req.params;

    const folder = await prisma.folder.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        createdAt: true,
        parent: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            files: true,
            children: true,
          },
        },
      },
    });

    if (!folder) {
      return res.status(404).json({ error: "Pasta não encontrada" });
    }

    res.json(folder);
  } catch (error) {
    console.error("❌ Erro ao carregar pasta leve:", error);
    res.status(500).json({ error: "Erro ao carregar pasta" });
  }
});

// ROTA PARA PASTAS RAÍZ
router.get("/folders/root", async (req, res) => {
  try {
    const defaultUser = await getDefaultUser();
    if (!defaultUser) {
      return res.status(400).json({ error: "Usuário padrão não configurado" });
    }

    console.log("🌳 Buscando pastas raiz...");

    const folders = await prisma.folder.findMany({
      where: {
        parentId: null,
        userId: defaultUser.id,
      },
      select: {
        id: true,
        name: true,
        createdAt: true,
        _count: {
          select: {
            files: true,
            children: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    console.log(`✅ Encontradas ${folders.length} pastas raiz`);
    res.json(folders);
  } catch (error) {
    console.error("❌ Erro ao carregar pastas:", error);
    res.status(500).json({ error: "Erro ao carregar pastas" });
  }
});

// ROTA PARA SERVIR ARQUIVOS (APENAS QUANDO PRECISAR DO CONTEÚDO)
router.get("/files/:id", async (req, res) => {
  try {
    const file = await prisma.file.findUnique({
      where: { id: req.params.id },
    });

    if (!file) {
      return res.status(404).json({ error: "Arquivo não encontrado" });
    }

    const buffer = Buffer.isBuffer(file.data)
      ? file.data
      : Buffer.from(file.data);

    res.setHeader("Content-Type", file.mimeType);
    res.setHeader("Content-Length", buffer.length);
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${file.originalName}"`
    );

    res.send(buffer);
  } catch (error) {
    console.error("❌ Erro ao recuperar arquivo:", error);
    res.status(500).json({ error: "Erro ao recuperar arquivo" });
  }
});

//  ROTA PARA THUMBNAILS DE IMAGENS (OPCIONAL)
router.get("/files/:id/thumbnail", async (req, res) => {
  try {
    const { width = 200, height = 200 } = req.query;

    const file = await prisma.file.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        mimeType: true,
        data: true,
      },
    });

    if (!file || !file.mimeType.startsWith("image/")) {
      return res.status(404).json({ error: "Imagem não encontrada" });
    }

    // Aqui você pode implementar geração de thumbnail
    // Por enquanto, retorna a imagem original
    const buffer = Buffer.isBuffer(file.data)
      ? file.data
      : Buffer.from(file.data);

    res.setHeader("Content-Type", file.mimeType);
    res.setHeader("Content-Length", buffer.length);
    res.send(buffer);
  } catch (error) {
    console.error("❌ Erro ao gerar thumbnail:", error);
    res.status(500).json({ error: "Erro ao gerar thumbnail" });
  }
});

// ========== ROTAS DE UPLOAD (MANTIDAS) ==========

// Rota para upload de arquivos
router.post("/files/upload", upload.single("file"), async (req, res) => {
  try {
    const { folderId } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: "Nenhum arquivo enviado" });
    }

    const defaultUser = await getDefaultUser();
    if (!defaultUser) {
      return res.status(400).json({ error: "Usuário padrão não configurado" });
    }

    const savedFile = await prisma.file.create({
      data: {
        name: file.originalname,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        data: file.buffer,
        folderId: folderId || null,
        userId: defaultUser.id,
      },
      select: {
        id: true,
        name: true,
        mimeType: true,
        size: true,
        createdAt: true,
      },
    });

    res.status(201).json(savedFile);
  } catch (error) {
    console.error("❌ Erro no upload:", error);
    res.status(500).json({ error: "Erro no upload: " + error.message });
  }
});

// Rota para criar pastas
router.post("/folders", async (req, res) => {
  try {
    const { name, parentId } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Nome da pasta é obrigatório" });
    }

    const defaultUser = await getDefaultUser();
    if (!defaultUser) {
      return res.status(400).json({ error: "Usuário padrão não configurado" });
    }

    const folder = await prisma.folder.create({
      data: {
        name,
        parentId: parentId || null,
        userId: defaultUser.id,
      },
      select: {
        id: true,
        name: true,
        createdAt: true,
        _count: {
          select: {
            files: true,
            children: true,
          },
        },
      },
    });

    res.json(folder);
  } catch (error) {
    console.error("❌ Erro ao criar pasta:", error);
    res.status(500).json({ error: "Erro ao criar pasta: " + error.message });
  }
});

// ========== ROTAS DE ATUALIZAÇÃO E DELEÇÃO ==========

// ATUALIZAR PASTA
router.put("/folders/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Nome da pasta é obrigatório" });
    }

    const updatedFolder = await prisma.folder.update({
      where: { id },
      data: { name },
      select: {
        id: true,
        name: true,
        createdAt: true,
        _count: {
          select: {
            files: true,
            children: true,
          },
        },
      },
    });

    res.json(updatedFolder);
  } catch (error) {
    console.error("❌ Erro ao atualizar pasta:", error);

    if (error.code === "P2025") {
      return res.status(404).json({ error: "Pasta não encontrada" });
    }

    res.status(500).json({ error: "Erro ao atualizar pasta" });
  }
});

// ATUALIZAR ARQUIVO
router.put("/files/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Nome do arquivo é obrigatório" });
    }

    const updatedFile = await prisma.file.update({
      where: { id },
      data: { name },
      select: {
        id: true,
        name: true,
        mimeType: true,
        size: true,
        createdAt: true,
      },
    });

    res.json(updatedFile);
  } catch (error) {
    console.error("❌ Erro ao atualizar arquivo:", error);

    if (error.code === "P2025") {
      return res.status(404).json({ error: "Arquivo não encontrado" });
    }

    res.status(500).json({ error: "Erro ao atualizar arquivo" });
  }
});

// DELETAR ARQUIVO
router.delete("/files/:id", async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.file.delete({
      where: { id },
    });

    res.json({ message: "Arquivo deletado com sucesso" });
  } catch (error) {
    console.error("❌ Erro ao deletar arquivo:", error);

    if (error.code === "P2025") {
      return res.status(404).json({ error: "Arquivo não encontrado" });
    }

    res.status(500).json({ error: "Erro ao deletar arquivo" });
  }
});

//ROTA PARA DELEÇÃO SIMPLES DE PASTA
router.delete("/folders/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se a pasta existe
    const folder = await prisma.folder.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            files: true,
            children: true,
          },
        },
      },
    });

    if (!folder) {
      return res.status(404).json({ error: "Pasta não encontrada" });
    }

    // Verificar se a pasta está vazia
    if (folder._count.files > 0 || folder._count.children > 0) {
      return res.status(400).json({
        error: "Não é possível deletar pasta não vazia",
        details: `A pasta contém ${folder._count.files} arquivos e ${folder._count.children} subpastas`,
        suggestion: "Use a rota recursiva para deletar com todo o conteúdo",
      });
    }

    // Deletar pasta vazia
    await prisma.folder.delete({
      where: { id },
    });

    res.json({
      message: "Pasta deletada com sucesso",
      deletedFolder: {
        id: folder.id,
        name: folder.name,
      },
    });
  } catch (error) {
    console.error("❌ Erro ao deletar pasta:", error);

    if (error.code === "P2025") {
      return res.status(404).json({ error: "Pasta não encontrada" });
    }

    if (error.code === "P2003") {
      return res.status(400).json({
        error: "Não é possível deletar pasta com conteúdo",
        details: "A pasta contém arquivos ou subpastas",
      });
    }

    res.status(500).json({ error: "Erro ao deletar pasta: " + error.message });
  }
});

// 🔥 DELETAR PASTA RECURSIVO
router.delete("/folders/:id/recursive", async (req, res) => {
  try {
    const { id } = req.params;

    async function deleteFolderRecursive(folderId) {
      const folderWithContent = await prisma.folder.findUnique({
        where: { id: folderId },
        include: {
          children: true,
          files: true,
        },
      });

      // Deletar arquivos
      if (folderWithContent.files.length > 0) {
        await prisma.file.deleteMany({
          where: { folderId },
        });
      }

      // Deletar subpastas recursivamente
      for (const child of folderWithContent.children) {
        await deleteFolderRecursive(child.id);
      }

      // Deletar a pasta atual
      await prisma.folder.delete({
        where: { id: folderId },
      });
    }

    await deleteFolderRecursive(id);

    res.json({
      message: "Pasta e todo seu conteúdo foram deletados com sucesso",
    });
  } catch (error) {
    console.error("❌ Erro ao deletar pasta recursivamente:", error);
    res.status(500).json({ error: "Erro ao deletar pasta" });
  }
});

// ========== ROTAS DE UPLOAD DE PASTAS (MANTIDAS) ==========

// 📦 UPLOAD DE PASTA VIA ZIP
router.post(
  "/folders/upload-zip",
  multiUpload.single("zipFile"),
  async (req, res) => {
    try {
      const { parentFolderId, folderName } = req.body;
      const zipFile = req.file;

      if (!zipFile) {
        return res.status(400).json({ error: "Nenhum arquivo ZIP enviado" });
      }

      const defaultUser = await getDefaultUser();
      if (!defaultUser) {
        return res
          .status(400)
          .json({ error: "Usuário padrão não configurado" });
      }

      // Criar pasta principal
      const mainFolder = await prisma.folder.create({
        data: {
          name: folderName || `Pasta-${Date.now()}`,
          parentId: parentFolderId || null,
          userId: defaultUser.id,
        },
      });

      const zip = new JSZip();
      const zipContent = await zip.loadAsync(zipFile.buffer);

      let filesProcessed = 0;
      let foldersProcessed = 0;

      for (const [relativePath, zipEntry] of Object.entries(zipContent.files)) {
        if (zipEntry.dir || relativePath.endsWith("/")) continue;

        const pathParts = relativePath
          .split("/")
          .filter((part) => part.length > 0);
        const fileName = pathParts.pop();

        if (!fileName) continue;

        let currentFolderId = mainFolder.id;

        for (let i = 0; i < pathParts.length; i++) {
          const folderName = pathParts[i];

          let existingFolder = await prisma.folder.findFirst({
            where: {
              name: folderName,
              parentId: currentFolderId,
              userId: defaultUser.id,
            },
          });

          if (!existingFolder) {
            existingFolder = await prisma.folder.create({
              data: {
                name: folderName,
                parentId: currentFolderId,
                userId: defaultUser.id,
              },
            });
            foldersProcessed++;
          }
          currentFolderId = existingFolder.id;
        }

        try {
          const fileData = await zipEntry.async("nodebuffer");

          await prisma.file.create({
            data: {
              name: fileName,
              originalName: fileName,
              mimeType: getMimeType(fileName),
              size: fileData.length,
              data: fileData,
              path: relativePath,
              folderId: currentFolderId,
              userId: defaultUser.id,
            },
          });

          filesProcessed++;
        } catch (fileError) {
          console.error(
            `Erro ao processar arquivo ${relativePath}:`,
            fileError
          );
        }
      }

      res.json({
        message: "Pasta uploadada com sucesso",
        filesProcessed,
        foldersProcessed,
        folder: mainFolder,
      });
    } catch (error) {
      console.error("❌ Erro no upload de pasta:", error);
      res
        .status(500)
        .json({ error: "Erro no upload de pasta: " + error.message });
    }
  }
);

export { router };
export default router;
