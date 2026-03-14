import { Router } from "express";
import passport from "../lib/passport.config.js";
import { User } from "../controller/user_class.js";

const router = Router();

router.get("/getAllUsers", User.getAllUsers);

router.post("/registerUser", User.RegisterUser);

router.post("/loginUser", User.loginUser);

router.get("/logoutUser", User.logoutUser);

router.post("/forgetPassword", User.forgetPassword);

router.put("/changePassword", User.changePassword);

// ─── Google OAuth Routes ──────────────────────────────────────────────────────

// Step 1: Redirect user to Google's consent screen
// Pass ?role=admin to make the new user an admin (only applies to first-time OAuth users)
router.get("/auth/google", (req, res, next) => {
    let role = "user";
    if (req?.query?.role) {
        role = req.query.role === "admin" ? "admin" : "user";
    }
    passport.authenticate("google", {
        scope: ["profile", "email"],
        session: false,
        state: role, // echoed back by Google in the callback as req.query.state
    })(req, res, next);
});

// Step 2: Google redirects back here after user grants/denies access
router.get(
    "/auth/google/callback",
    passport.authenticate("google", {
        session: false,
        failureRedirect: "/backend/auth/google/failure",
    }),
    User.googleOAuthCallback
);

// Step 3: Shown if Google auth fails or user denies access
router.get("/auth/google/failure", User.googleOAuthFailure);

export const user_router = router;
