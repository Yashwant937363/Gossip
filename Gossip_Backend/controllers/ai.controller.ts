import type { NextFunction, Request, Response } from "express";
import {
  analyzeImage,
  generateChatbotReply,
  summarizeConversation,
  translateMessages,
} from "../services/groq.service.js";
import type {
  AnalyzeImageInput,
  ChatbotInput,
  SummarizationInput,
  TranslateMessagesInput,
} from "@gossip/shared";
import {
  APIError,
  ChatbotResult,
  ImageAnalysisResult,
  SummarizationResult,
  TranslateMessagesResult,
} from "@gossip/shared";
import { JWTPayload } from "../types/auth.types.js";
import { saveMessageTranslations } from "../repository/chat.repository.js";

export const handleChatbot = async (
  req: Request<{}, {}, ChatbotInput>,
  res: Response<ChatbotResult | APIError, JWTPayload>,
  next: NextFunction,
) => {
  try {
    const { message, tone, history, sessionId } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Message string is required" });
    }

    const result = await generateChatbotReply({
      message,
      tone,
      history,
      sessionId,
    });

    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const handleImageAnalyze = async (
  req: Request<{}, {}, AnalyzeImageInput>,
  res: Response<ImageAnalysisResult | APIError, JWTPayload>,
  next: NextFunction,
) => {
  try {
    const { url, prompt } = req.body;

    if (!url || typeof url !== "string") {
      return res.status(400).json({ error: "Image url is required" });
    }

    const result = await analyzeImage({ url, prompt });
    return res.status(200).json(result);
  } catch (error: any) {
    next(error);
  }
};

export const handleTranslate = async (
  req: Request<{}, {}, TranslateMessagesInput>,
  res: Response<TranslateMessagesResult | APIError, JWTPayload>,
  next: NextFunction,
) => {
  try {
    const { messages, to } = req.body;
    console.log(messages);

    if (!to || typeof to !== "string") {
      return res
        .status(400)
        .json({ error: "Target language 'to' is required" });
    }

    if (!Array.isArray(messages)) {
      return res.status(400).json({ error: "Messages array is required" });
    }

    const result = await translateMessages({ messages, to });

    if (result?.messages && result.messages.length > 0) {
      await saveMessageTranslations(result.language, result.messages);
    }

    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const handleSummarize = async (
  req: Request<{}, {}, SummarizationInput>,
  res: Response<SummarizationResult | APIError, JWTPayload>,
  next: NextFunction,
) => {
  try {
    const { conversation, format } = req.body;

    if (!Array.isArray(conversation)) {
      return res.status(400).json({ error: "Conversation array is required" });
    }

    const result = await summarizeConversation({ conversation, format });
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};
