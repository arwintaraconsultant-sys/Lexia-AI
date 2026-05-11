import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize AI Clients
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // Unified AI Proxy Route
  app.post("/api/ai", async (req, res) => {
    try {
      const { provider, prompt, history, systemInstruction, temperature, file } = req.body;

      // --- GEMINI HANDLER ---
      if (provider === 'gemini') {
        const model = genAI.getGenerativeModel({ 
          model: "gemini-1.5-flash",
          systemInstruction: systemInstruction
        });
        
        const chat = model.startChat({
          history: history.map((h: any) => ({
            role: h.role,
            parts: h.parts
          })),
          generationConfig: { temperature: temperature || 0.7 }
        });

        // Handle file for Gemini if provided
        let result;
        if (file && file.data) {
          const filePart = {
            inlineData: {
              data: file.data.includes(',') ? file.data.split(',')[1] : file.data,
              mimeType: file.type
            }
          };
          result = await model.generateContent([prompt, filePart]);
        } else {
          result = await chat.sendMessage(prompt);
        }
        
        res.json({ text: result.response.text() });
      } 
      
      // --- OPENAI HANDLER ---
      else if (provider === 'openai') {
        const messages: any[] = [
          { role: "system", content: systemInstruction },
          ...history.map((h: any) => ({
            role: h.role === 'model' ? 'assistant' : 'user',
            content: h.parts[0].text,
          }))
        ];

        const userContent: any[] = [{ type: "text", text: prompt }];
        if (file && file.data) {
          if (file.type.startsWith('image/')) {
            userContent.push({ type: "image_url", image_url: { url: file.data } });
          } else {
            userContent.push({ type: "text", text: `\n\n[FILE CONTENT: ${file.name}]\n${file.data.includes('base64,') ? Buffer.from(file.data.split(',')[1], 'base64').toString() : file.data}` });
          }
        }
        messages.push({ role: 'user', content: userContent });

        const response = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: messages,
          temperature: temperature || 0.7,
        });
        res.json({ text: response.choices[0].message.content });
      }

      // --- CLAUDE HANDLER ---
      else if (provider === 'claude') {
        const messages: any[] = history.map((h: any) => ({
          role: h.role === 'model' ? 'assistant' : 'user',
          content: h.parts[0].text,
        }));

        const content: any[] = [];
        if (file && file.data) {
          if (file.type === 'application/pdf') {
            content.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: file.data.split(',')[1] } });
          } else if (file.type.startsWith('image/')) {
            content.push({ type: 'image', source: { type: 'base64', media_type: file.type, data: file.data.split(',')[1] } });
          } else {
            content.push({ type: 'text', text: `[FILE CONTENT: ${file.name}]\n${file.data.includes('base64,') ? Buffer.from(file.data.split(',')[1], 'base64').toString() : file.data}` });
          }
        }
        content.push({ type: 'text', text: prompt });
        messages.push({ role: 'user', content });

        const response = await anthropic.messages.create({
          model: "claude-3-5-sonnet-20241022",
          max_tokens: 4096,
          system: systemInstruction,
          messages: messages,
          temperature: temperature || 0.7,
        });
        const text = response.content.find(c => c.type === 'text')?.text || "";
        res.json({ text });
      }

      else {
        res.status(400).json({ error: "Invalid provider" });
      }
    } catch (error: any) {
      console.error("AI Proxy Error:", error);
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
