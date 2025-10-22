// server.js
import express from "express";
import cors from "cors";
import userRoutes from "./routes/userRoutes.js";

const app = express();
const PORT = 3001;

// Domínios permitidos
const allowedOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:5500",
  "https://media-flow-mk.vercel.app",
  "https://media-flow-ifgvg0t53-alex-oliveira-da-rochas-projects.vercel.app",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        console.warn("Origem bloqueada pelo CORS:", origin);
        return callback(new Error("CORS não permitido para esta origem"));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// Middleware para parsear JSON com limite aumentado
app.use(express.json({ limit: "1gb" }));
app.use(express.urlencoded({ extended: true, limit: "1gb" }));

app.get("/", (req, res) => {
  res.json({
    message: "API MediaFlow MK funcionando!",
    limits: "Suporta arquivos até 1GB",
  });
});

app.use("/api", userRoutes);

// Rota 404
app.use((req, res) => {
  res.status(404).json({ error: "Rota não encontrada" });
});

// Middleware de tratamento de erros
app.use((error, req, res, next) => {
  console.error("Erro no servidor:", error);
  res.status(500).json({ error: "Erro interno do servidor" });
});

app.listen(PORT, () => {
  console.log(`✅ Servidor rodando na porta ${PORT}`);
});
