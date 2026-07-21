import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini SDK with telemetry header
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// AI DJ Assistant Endpoint
app.post("/api/dj/assistant", async (req, res) => {
  try {
    const { deckA, deckB, mixer, history, userPrompt } = req.body;

    const currentContext = `
Live DJ Deck State:
- DECK A (Left Deck):
  * Track Name: "${deckA.trackName || "None"}"
  * Tempo/BPM: ${deckA.bpm || "Unknown"} (Pitch Adjust: ${deckA.pitch || 0}%)
  * Volume: ${Math.round((deckA.volume || 0) * 100)}%
  * EQ Low: ${deckA.eqLow || 0}, Mid: ${deckA.eqMid || 0}, High: ${deckA.eqHigh || 0}
  * Filter (HPF/LPF): ${deckA.filter || 0}
  * Is Playing: ${deckA.isPlaying ? "Yes" : "No"}

- DECK B (Right Deck):
  * Track Name: "${deckB.trackName || "None"}"
  * Tempo/BPM: ${deckB.bpm || "Unknown"} (Pitch Adjust: ${deckB.pitch || 0}%)
  * Volume: ${Math.round((deckB.volume || 0) * 100)}%
  * EQ Low: ${deckB.eqLow || 0}, Mid: ${deckB.eqMid || 0}, High: ${deckB.eqHigh || 0}
  * Filter (HPF/LPF): ${deckB.filter || 0}
  * Is Playing: ${deckB.isPlaying ? "Yes" : "No"}

- MIXER GENERAL:
  * Crossfader Position: ${mixer.crossfader || 0} (Range: -1 to +1, where -1 is Deck A only, +1 is Deck B only, 0 is both)
  * Active Soundpad Samples: [${(mixer.activeSamples || []).join(", ")}]

- USER DJ MESSAGE / REQUEST:
  "${userPrompt || "Give me transition advice and a cool hype commentary!"}"
`;

    const systemInstruction = `
You are the ultimate digital DJ Co-Host, Producer, and Mixing Guru: "MoboDJ Coach".
Your style is extremely high energy, positive, and deeply knowledgeable about electronic, hip-hop, house, synthwave, techno, and ambient music. Use organic DJ terms like "EQ kill", "fader slam", "sweeping filter", "beatmatch", "drop", "phasing", and "harmonic mixing".
Analyze the live DJ deck state and provide advice in structured JSON. Do NOT output standard conversational text outside JSON.
Your JSON must match the responseSchema exactly.
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: currentContext,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            hypeComment: {
              type: Type.STRING,
              description: "A funny, enthusiastic, high-energy comment reacting to the current mix or user prompt. Be the perfect radio hypeman!"
            },
            transitionTips: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Pro step-by-step DJ guidance on how to blend/transition Deck A and Deck B smoothly based on their current volumes, EQ, filters, and BPM differences."
            },
            musicRecommendations: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  genre: { type: Type.STRING },
                  suggestedBpm: { type: Type.NUMBER },
                  transitionStyle: { type: Type.STRING, description: "How to bring this suggested song in next (e.g. 'Intro Beat Blend', 'Sudden Drop Slam', 'Filter fade')" }
                },
                required: ["title", "genre", "suggestedBpm", "transitionStyle"]
              },
              description: "2 or 3 ideal track recommendations to load next, complete with title, genre, suitable BPM, and transition style advice."
            }
          },
          required: ["hypeComment", "transitionTips", "musicRecommendations"]
        }
      }
    });

    const aiResponseText = response.text || "{}";
    res.setHeader("Content-Type", "application/json");
    res.send(aiResponseText);
  } catch (error: any) {
    console.error("Gemini API error:", error);
    res.status(500).json({
      error: "Could not fetch AI DJ advice. Make sure your GEMINI_API_KEY is configured.",
      details: error.message
    });
  }
});

// Mount Vite middleware for dev or static asset hosting for production
const startServer = async () => {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite dev middleware mounted.");
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("Production static build serving from dist.");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`MoboDJ Server running on http://0.0.0.0:${PORT}`);
  });
};

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
