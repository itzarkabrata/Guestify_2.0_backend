import express from "express";
import { Router } from "express";
import { Webhooks } from "../controller/webhooks_class.js";

const router = Router();

// Stripe Webhook
router.post("/", Webhooks.handleStripeWebhook);


export const webhook_router = router;