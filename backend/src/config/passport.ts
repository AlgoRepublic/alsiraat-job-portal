import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { MultiSamlStrategy as SamlStrategy } from "passport-saml";
import bcrypt from "bcryptjs";
import User, { UserRole } from "../models/User";
import dotenv from "dotenv";

dotenv.config();

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
                role: UserRole.INDEPENDENT,
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

// SAML Strategy (Al-Siraat College)
if (process.env.SAML_ENTRY_POINT) {
  passport.use(
    new SamlStrategy(
      {
        getSamlOptions: (req, done) => {
          done(null, {
            path: "/api/auth/saml/callback",
            entryPoint: process.env.SAML_ENTRY_POINT!,
            issuer: process.env.SAML_ISSUER || "tasker-app",
            cert: process.env.SAML_CERT || "",
          });
        },
      },
      async (profile: any, done: any) => {
        try {
          const email = profile.email;
          if (!email) {
            return done(new Error("No email found in SAML profile"));
          }

          let user = await User.findOne({ samlId: profile.nameID });
          if (!user) {
            const existingUser = await User.findOne({ email });
            if (existingUser) {
              existingUser.samlId = profile.nameID;
              await existingUser.save();
              user = existingUser;
            } else {
              user = await User.create({
                name: profile.displayName || profile.cn || "SAML User",
                email,
                samlId: profile.nameID,
                role: UserRole.MEMBER, // Default to Member for SAML users
              });
            }
          }
          return done(null, user);
        } catch (err) {
          return done(err);
        }
      },
    ),
  );
}

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user as Express.User);
  } catch (err) {
    done(err);
  }
});

export default passport;
