import { Router } from "express";
import {
  handleChatbot,
  handleImageAnalyze,
  handleSummarize,
  handleTranslate,
} from "../controllers/ai.controller.js";
import authUser from "../middlewares/authUser.middleware.js";

const router = Router();

router.post("/chatbot", authUser, handleChatbot);
router.post("/analyze-image", authUser, handleImageAnalyze);
router.post("/translate", authUser, handleTranslate);
router.post("/summarize", authUser, handleSummarize);

export default router;
