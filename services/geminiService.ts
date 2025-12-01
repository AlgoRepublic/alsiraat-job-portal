import { GoogleGenAI } from "@google/genai";
import { JobCategory } from "../types";

// Initialize client
const apiKey = process.env.API_KEY || ''; 
// Note: In a real app, we'd handle missing keys gracefully. 
// For this demo, we assume the environment provides it or the user will provide it.

const ai = new GoogleGenAI({ apiKey });

export const generateJobDescription = async (title: string, category: JobCategory, keyPoints: string): Promise<string> => {
  if (!apiKey) {
    console.warn("API Key missing for Gemini");
    return "Gemini API Key is missing. Please configure it to use AI generation.";
  }

  try {
    const prompt = `
      You are an expert HR assistant. Write a professional and engaging job description for a role with the following details:
      Title: ${title}
      Category: ${category}
      Key Requirements/Points: ${keyPoints}

      Keep the tone professional but encouraging. Structure it with a brief introduction, responsibilities, and requirements.
      Limit the response to around 200 words.
      Format with simple paragraphs and bullet points (use standard markdown).
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "Could not generate description.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Error generating content. Please try again.";
  }
};

export const analyzeResume = async (resumeText: string): Promise<string> => {
    if (!apiKey) return "API Key missing";
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Analyze this resume text and extract 3 key strengths and a brief summary: ${resumeText.substring(0, 1000)}...`
        });
        return response.text || "";
    } catch (e) {
        return "Analysis failed.";
    }
}
