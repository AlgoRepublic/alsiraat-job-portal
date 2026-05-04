import { Request, Response } from "express";
import mongoose from "mongoose";
import AiSettings from "../models/AiSettings.js";
import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";

/** Admin GET/PUT: always scoped to JWT active organisation. */
async function resolveAiSettingsDocForAdmin(req: Request, res: Response) {
  const orgId = (req as any).orgId?.toString?.() ?? null;
  if (!orgId) {
    res.status(400).json({
      message: "Select an organisation to manage AI settings",
    });
    return null;
  }
  let doc = await AiSettings.findOne({
    organisation: new mongoose.Types.ObjectId(orgId),
  });
  if (doc) return doc;
  doc = await AiSettings.create({
    provider: "gemini",
    apiKey: "",
    organisation: new mongoose.Types.ObjectId(orgId),
  } as any);
  return doc;
}

async function resolveAiSettingsForGenerate(req: Request) {
  const orgId = (req as any).orgId?.toString?.() ?? null;
  if (orgId) {
    const scoped = await AiSettings.findOne({
      organisation: new mongoose.Types.ObjectId(orgId),
    });
    if (scoped?.apiKey) return scoped;
  }
  const legacy = await AiSettings.findOne({
    $or: [{ organisation: null }, { organisation: { $exists: false } }],
  });
  return legacy;
}

export const getAiSettings = async (req: Request, res: Response) => {
  try {
    const settings = await resolveAiSettingsDocForAdmin(req, res);
    if (!settings) return;

    res.json({
      provider: settings.provider,
      hasApiKey: !!settings.apiKey,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateAiSettings = async (req: Request, res: Response) => {
  try {
    const { provider, apiKey } = req.body;

    const settings = await resolveAiSettingsDocForAdmin(req, res);
    if (!settings) return;
    if (provider) settings.provider = provider;
    if (apiKey !== undefined && apiKey !== "HIDDEN") {
      settings.apiKey = apiKey;
    }
    await settings.save();

    res.json({ message: "AI Settings updated successfully" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const generateJobDescription = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { title, category, keyPoints } = req.body;
    let settings = await resolveAiSettingsForGenerate(req);

    if (!settings || !settings.apiKey) {
      if (process.env.VITE_GEMINI_API_KEY) {
        settings = {
          apiKey: process.env.VITE_GEMINI_API_KEY,
          provider: "gemini",
        } as any;
      } else {
        res
          .status(400)
          .json({
            message:
              "AI is not configured. Please add an API key in Admin Settings.",
          });
        return;
      }
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

    let result = "";

    try {
      if (settings?.provider === "gemini") {
        const gemini = new GoogleGenAI({ apiKey: settings.apiKey });
        const response = await gemini.models.generateContent({
          model: "gemini-2.5-flash", // Good stable model
          contents: prompt,
        });
        result = response.text || "";
      } else if (settings?.provider === "chatgpt") {
        const openai = new OpenAI({ apiKey: settings.apiKey });
        const response = await openai.chat.completions.create({
          model: "gpt-4o-mini", // Cost effective, fast
          messages: [{ role: "user", content: prompt }],
        });
        result = response.choices[0]?.message?.content || "";
      } else if (settings?.provider === "anthropic") {
        const anthropic = new Anthropic({ apiKey: settings.apiKey });
        const response = await anthropic.messages.create({
          model: "claude-3-5-haiku-latest",
          max_tokens: 1000,
          messages: [{ role: "user", content: prompt }],
        });
        if (response.content?.[0]?.type === "text") {
          result = response.content[0].text;
        }
      }
    } catch (apiError: any) {
      console.error("AI API Error:", apiError);
      res
        .status(502)
        .json({
          message: "Error from AI provider. Check your API key or connection.",
        });
      return;
    }

    res.json({ text: result || "Could not generate task description." });
  } catch (error: any) {
    console.error("Generate Description Error:", error);
    res.status(500).json({ message: "Internal server error during generation" });
  }
};
