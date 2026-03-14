import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { User_Model } from "../models/users.js";

/**
 * Google OAuth 2.0 Strategy Configuration
 *
 * This configures passport to use Google OAuth.
 * On a successful Google authentication:
 *  - If a user with the given email already exists → return that user.
 *  - If no user exists → create a new one with oauth_provider = 'google'.
 *
 * NOTE: Sessions are NOT used in this application (stateless JWT).
 * serializeUser / deserializeUser are defined as no-ops to satisfy
 * passport's internal requirements during the redirect dance.
 */

passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_OAUTH_CLIENT_ID,
            clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
            callbackURL: process.env.GOOGLE_OAUTH_CALLBACK_URL,
            passReqToCallback: true, // gives us req in the verify callback
        },
        async (req, _accessToken, _refreshToken, profile, done) => {
            try {
                const email = profile.emails?.[0]?.value;

                if (!email) {
                    return done(new Error("No email found in Google profile"), null);
                }

                // Try to find an existing user with this email
                let user = await User_Model.findOne({ email });

                if (!user) {
                    // Read role from the OAuth state param (set by the /auth/google route)
                    let is_admin = false;
                    if (req?.query?.state) {
                        is_admin = req.query.state === "admin";
                    }

                    // Create a brand-new user from Google profile data
                    const nameParts = profile.displayName?.split(" ") ?? [];
                    const first_name = nameParts[0] ?? profile.name?.givenName ?? "Google";
                    const last_name =
                        nameParts.slice(1).join(" ") || profile.name?.familyName || "User";

                    user = await User_Model.create({
                        first_name,
                        last_name,
                        email,
                        password: null,          // No password for OAuth users
                        oauth_provider: "google",
                        image_url: profile.photos?.[0]?.value ?? null,
                        is_admin,                // Set from ?role=admin query param
                    });
                }

                return done(null, user);
            } catch (err) {
                return done(err, null);
            }
        }
    )
);

// Minimal serialize/deserialize — required by passport internally even in
// stateless mode (the callback redirect goes through passport's middleware).
passport.serializeUser((user, done) => done(null, user._id));
passport.deserializeUser((id, done) => done(null, { _id: id }));

export default passport;
