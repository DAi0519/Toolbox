import { GoogleGenAI } from "@google/genai";
import type { GenerationSettings } from "../types";

const MODEL_NAME = 'gemini-3-pro-image-preview';

async function generateSingleImage(ai: GoogleGenAI, settings: GenerationSettings): Promise<string> {
  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: {
      parts: [
        { text: settings.prompt }
      ]
    },
    config: {
      imageConfig: {
        aspectRatio: settings.aspectRatio,
        imageSize: settings.imageSize
      }
    }
  });

  const candidates = response.candidates;
  if (candidates && candidates.length > 0) {
    const parts = candidates[0].content?.parts;
    if (parts) {
      for (const part of parts) {
        if (part.inlineData?.data) {
          const base64Data = part.inlineData.data;
          const mimeType = part.inlineData.mimeType || 'image/png';
          return `data:${mimeType};base64,${base64Data}`;
        }
      }
    }
  }
  throw new Error("No image data found in response");
}

export async function generateImages(apiKey: string, settings: GenerationSettings): Promise<string[]> {
  try {
    const ai = new GoogleGenAI({ apiKey });

    const promises = Array.from({ length: settings.numberOfImages }).map(() =>
      generateSingleImage(ai, settings)
    );

    return await Promise.all(promises);
  } catch (error: unknown) {
    console.error("Image generation failed:", error);
    if (error instanceof Error && error.message.includes("Requested entity was not found")) {
      throw new Error("Invalid API Key. Please click the Key icon to re-enter your key.");
    }
    throw error instanceof Error ? error : new Error("Image generation failed.");
  }
}
