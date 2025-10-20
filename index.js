// server.js
import express from "express";
import cors from "cors";
import userRoutes from "./routes/userRoutes.js";

const app = express();
const PORT = 3001;

// Configuração do CORS
app.use(
  cors({
    origin: ["http://localhost:3000", "http://127.0.0.1:5500"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type"],
  })
);

// Middlewares
app.use(express.json({ limit: "1gb" }));
app.use(express.urlencoded({ extended: true, limit: "1gb" }));

// Rota de health check
app.get("/", (req, res) => {
  res.json({
    message: "Servidor ativo na porta http://localhost:3001",
  });
});

// Usar as rotas
app.use("/api", userRoutes);

app.get("/", (req, res) => {
  res.json({
    message: "API Media Manager funcionando!",
    limits: "Suporta arquivos até 1GB",
  });
});
// Rota para tratamento de erros 404
app.use((req, res) => {
  res.status(404).json({ error: "Rota não encontrada" });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error("Erro no servidor:", error);
  res.status(500).json({ error: "Erro interno do servidor" });
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log(`📦 Limites configurados: ZIPs até 1GB`);
});
