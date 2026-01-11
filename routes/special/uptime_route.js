import {Router} from "express";

const router = Router();

router.get("/health", (_req, res) => {
    try{
        return res.status(200).json({ status: "healthy", timestamp: new Date().toISOString() });
    } catch (error) {
        console.error("Health check failed:", error);
        return res.status(500).json({ status: "unhealthy", error: "Internal Server Error" });
    }
});

export const uptime_router = router;