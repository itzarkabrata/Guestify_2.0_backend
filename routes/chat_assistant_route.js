import {Router} from "express";
import { chatWithAssistant } from "../controller/chat_assistant_class.js";

const router = Router();

router.post("/chatAssistant", chatWithAssistant);

export const chat_assistant_router = router;