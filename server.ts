import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // API Routes
  app.post("/api/openai", async (req, res) => {
    try {
      const { prompt, history, systemInstruction, temperature, file } = req.body;

      const messages: any[] = [
        { role: "system", content: systemInstruction },
        ...history.map((h: any) => ({
          role: h.role === 'model' ? 'assistant' : 'user',
          content: h.parts[0].text,
        }))
      ];

      const userContent: any[] = [{ type: "text", text: prompt }];
      
      if (file) {
        if (file.type.startsWith('image/')) {
          userContent.push({
            type: "image_url",
            image_url: {
              url: file.data, // OpenAI expects full data URL or link
            },
          });
        } else if (file.type === 'application/pdf' || file.name.endsWith('.docx')) {
          // OpenAI directly doesn't support PDF/Docx in Chat Completions without Assistants API
          // So we pass the text content if it's already extracted or small enough
          // For now, we prepend it as text if it's not an image
          userContent.push({
            type: "text",
            text: `\n\n[Konten Dokumen: ${file.name}]\n${file.data.includes('base64,') ? Buffer.from(file.data.split(',')[1], 'base64').toString() : file.data}`
          });
        }
      }

      messages.push({
        role: 'user',
        content: userContent,
      });

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: messages,
        temperature: temperature || 0.7,
      });

      const text = response.choices[0].message.content || "";
      res.json({ text });
    } catch (error: any) {
      console.error("OpenAI API Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite integration
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
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
