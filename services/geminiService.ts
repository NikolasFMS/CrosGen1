import { GoogleGenAI, Type } from "@google/genai";
import { GeneratedContent } from "../types";

export const generateCrosswordData = async (topic: string, language: string = 'English'): Promise<GeneratedContent> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found in environment");
  }

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `Generate a list of 10-15 distinct words related to the topic "${topic}" in the language "${language}". 
  Provide a short, crossword-style clue for each word. 
  The words should be suitable for a crossword puzzle (no spaces, punctuation, or special characters in the word itself).`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            words: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  word: { type: Type.STRING },
                  clue: { type: Type.STRING }
                },
                required: ["word", "clue"]
              }
            }
          },
          required: ["words"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    return JSON.parse(text) as GeneratedContent;

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};