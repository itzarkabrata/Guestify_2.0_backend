import { Router } from "express";
import { User } from "../controller/user_class.js";
import { LLMController } from "./controller.js";

const router = Router();

router.post("/aggrement/generate", LLMController.generate);

export const llm_route = router;