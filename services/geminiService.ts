import { GoogleGenAI } from "@google/genai";
import { JobCategory } from "../types";

// Fix: Initialize GoogleGenAI strictly following guidelines using VITE_GEMINI_API_KEY
const ai = new GoogleGenAI({
  apiKey: import.meta.env.VITE_GEMINI_API_KEY as string,
});

export const generateJobDescription = async (
  title: string,
  category: JobCategory,
  keyPoints: string,
): Promise<string> => {
  try {
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

    // Fix: Use ai.models.generateContent directly with model name and content. 'gemini-3-flash-preview' is used for basic text tasks.
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });

    // Fix: Access response.text directly as a property
    return response.text || "Could not generate task description.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Error generating task content. Please try again.";
  }
};

export const analyzeResume = async (resumeText: string): Promise<string> => {
  try {
    // Fix: Use ai.models.generateContent directly with the correct model and prompt
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyze this resume text for the Tasker platform and extract 3 key technical strengths and a brief summary of the tasker's background: ${resumeText.substring(0, 1000)}...`,
    });
    // Fix: Access response.text directly as a property
    return response.text || "";
  } catch (e) {
    console.error("Gemini Resume Analysis Error:", e);
    return "Analysis failed.";
  }
};
