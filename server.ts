import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { generateScenesPipeline, generateSceneImage, HttpError } from "./server/geminiService";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "2mb" }));

  app.post("/api/generate", async (req, res) => {
    try {
      const result = await generateScenesPipeline(req.body || {});
      return res.json(result);
    } catch (error: any) {
      console.error("Gemini Error:", error);
      const status = error instanceof HttpError ? error.statusCode : 500;
      return res.status(status).json({ error: error?.message || "An unexpected error occurred." });
    }
  });

  app.post("/api/generate-image", async (req, res) => {
    try {
      const result = await generateSceneImage(req.body?.prompt);
      return res.json(result);
    } catch (error: any) {
      console.error("Image gen error:", error);
      const status = error instanceof HttpError ? error.statusCode : 500;
      return res.status(status).json({ error: error?.message || "Image generation failed" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
