import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as OpenIDConnectStrategy, Profile as OpenIDConnectProfile, VerifyCallback as OpenIDConnectVerifyCallback } from "passport-openidconnect";
import bcrypt from "bcryptjs";
import User, { UserRole } from "../models/User.js";
import { fetchOIDCConfiguration } from "./oidcDiscovery.js";
import { oidcStateStore } from "./oidcStateStore.js";
import jwt from "jsonwebtoken";

// Local Strategy
passport.use(
  new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password",
    },
    async (email, password, done) => {
      try {
        const user = await User.findOne({ email });
        if (!user)
          return done(null, false, { message: "Invalid email or password" });
        if (!user.password)
          return done(null, false, {
            message: "Please login using external provider",
          });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch)
          return done(null, false, { message: "Invalid email or password" });

        return done(null, user);
      } catch (err) {
        return done(err);
      }
    },
  ),
);

// Google Strategy
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL:
          process.env.GOOGLE_CALLBACK_URL || "/api/auth/google/callback",
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) {
            return done(new Error("No email found in Google profile"));
          }

          let user = await User.findOne({ googleId: profile.id });
          if (!user) {
            // Check if user exists with same email
            const existingUser = await User.findOne({ email });
            if (existingUser) {
              existingUser.googleId = profile.id;
              await existingUser.save();
              user = existingUser;
            } else {
              user = await User.create({
                name: profile.displayName,
                email,
                googleId: profile.id,
                avatar: profile.photos?.[0]?.value ?? "",
                role: UserRole.APPLICANT,
              });
            }
          }
          return done(null, user as Express.User);
        } catch (err) {
          return done(err as Error);
        }
      },
    ),
  );
}

// OpenID Connect Strategy (ADFS)
// Fetches configuration from .well-known/openid-configuration at startup
// Using public client flow (no client secret required)
if (process.env.OIDC_ISSUER && process.env.OIDC_CLIENT_ID) {
  // Fetch OIDC configuration asynchronously and configure passport
  fetchOIDCConfiguration(process.env.OIDC_ISSUER)
    .then((config) => {
      passport.use(
        new OpenIDConnectStrategy(
          {
            issuer: config.issuer,
            authorizationURL: config.authorization_endpoint,
            tokenURL: config.token_endpoint,
            userInfoURL: config.userinfo_endpoint,
            clientID: process.env.OIDC_CLIENT_ID!,
            clientSecret: '', // Public client - no secret required
            callbackURL: process.env.OIDC_CALLBACK_URL || "/api/auth/oidc/callback",
            scope: ["openid", "profile", "email"],
            store: oidcStateStore as any, // in-memory store so state works without session cookie on IdP redirect
          },
          async (issuer: string, profile: OpenIDConnectProfile, context: object, idToken: string | object, done: OpenIDConnectVerifyCallback) => {
            try {

              // pretty print the profile
              console.log("OIDC Issuer:", issuer);
              console.log("OIDC Profile:", JSON.stringify(profile, null, 2));
              console.log("OIDC Context:", JSON.stringify(context, null, 2));
              // console.log("OIDC ID Token:", JSON.stringify(idToken, null, 2));

              // Use email from ID token only (e.g. ADFS: email claim)
              const decodedIdToken = jwt.decode(idToken as string);
              const decoded = decodedIdToken && typeof decodedIdToken === "object" ? (decodedIdToken as Record<string, unknown>) : null;
              const email = typeof decoded?.email === "string" ? decoded.email : undefined;
              if (!email) {
                return done(new Error("No email found in ID token"));
              }

              let user = await User.findOne({ oidcId: profile.id });
              if (user) {
                const name = decoded?.unique_name ? (decoded.unique_name as string) : "SSO User";
                if (user.name !== name) {
                  user.name = name;
                  await user.save();
                }

                if (user.email !== email) {
                  const existingUser = await User.findOne({ email, _id: { $ne: user._id } });
                  if (existingUser) {
                    return done(new Error("Email already in use by another user"));
                  }
                  user.email = email;
                  await user.save();
                }
              } else {
                const existingUser = await User.findOne({ email });
                if (existingUser) {
                  existingUser.oidcId = profile.id;
                  await existingUser.save();
                  user = existingUser;

                  await User.updateMany(
                    { oidcId: profile.id, _id: { $ne: existingUser._id } },
                    { $unset: { oidcId: "" } },
                  );
                } else {
                  user = await User.create({
                    name: decoded?.unique_name ? (decoded.unique_name as string) : "SSO User",
                    email,
                    oidcId: profile.id,
                    role: UserRole.APPLICANT, // Default to Applicant for OIDC users
                  });
                }
              }
              return done(null, user);
            } catch (err) {
              console.log('[Passport] Failed to configure OIDC strategy:', err);
              return done(err as Error);
            }
          },
        ),
      );
    })
    .catch((error) => {
      console.log('[Passport] Failed to configure OIDC strategy:', error);
      console.log('[Passport] SSO login will not be available');
    });
}

passport.serializeUser((user, done) => {
  done(null, (user as any)._id ?? (user as any).id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user as Express.User);
  } catch (err) {
    done(err);
  }
});

export default passport;
