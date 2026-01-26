import { GoogleGenAI } from "@google/genai";
import { JobCategory } from "../types";

// Lazy-load Gemini AI only when needed (optional feature)
let ai: GoogleGenAI | null = null;

const getAI = () => {
  if (!ai) {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string;
    if (!apiKey) {
      console.warn(
        "Gemini API key not configured. AI features will be disabled.",
      );
      return null;
    }
    ai = new GoogleGenAI({ apiKey });
  }
  return ai;
};

export const generateJobDescription = async (
  title: string,
  category: JobCategory,
  keyPoints: string,
): Promise<string> => {
  try {
    const gemini = getAI();
    if (!gemini) {
      return "AI-powered job description generation is not available. Please write the description manually.";
    }

    const prompt = `
      You are an expert HR assistant for "Tasker", an enterprise task orchestration platform. 
      Write a professional and engaging description for a high-impact task with the following details:
      Designation: ${title}
      Domain: ${category}
      Key Resolution Points: ${keyPoints}

      Keep the tone professional and technical. Structure it with a brief mission statement, resolution steps, and prerequisites.
      Limit the response to around 200 words.
      Format with simple paragraphs and bullet points (use standard markdown).
    `;

    const response = await gemini.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });

    return response.text || "Could not generate task description.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Error generating task content. Please try again or write manually.";
  }
};

export const analyzeResume = async (resumeText: string): Promise<string> => {
  try {
    const gemini = getAI();
    if (!gemini) {
      return "AI-powered resume analysis is not available.";
    }

    const response = await gemini.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyze this resume text for the Tasker platform and extract 3 key technical strengths and a brief summary of the tasker's background: ${resumeText.substring(0, 1000)}...`,
    });

    return response.text || "";
  } catch (e) {
    console.error("Gemini Resume Analysis Error:", e);
    return "Analysis failed.";
  }
};
