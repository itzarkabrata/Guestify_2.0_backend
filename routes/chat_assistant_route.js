import {Router} from "express";
import { ChatAssistant } from "../controller/chat_assistant_class.js";

const router = Router();

router.post("/chat", ChatAssistant.chat);
export const chat_assistant_router = router;