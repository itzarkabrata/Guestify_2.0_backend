import { Router } from "express";
import { User } from "../controller/user_class.js";
import { LLMModel } from "./controller.js";

const router = Router();

router.get("/aggrement/generate", User.isLoggedIn, LLMModel.generateResponse);

export const llm_route = router;