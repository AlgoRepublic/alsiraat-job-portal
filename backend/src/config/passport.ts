import passport from "passport";
import mongoose from "mongoose";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as OpenIDConnectStrategy, Profile as OpenIDConnectProfile, VerifyCallback as OpenIDConnectVerifyCallback } from "passport-openidconnect";
import bcrypt from "bcryptjs";
import User, { UserRole } from "../models/User.js";
import Role from "../models/Role.js";
import Organization from "../models/Organization.js";
import { fetchOIDCConfiguration } from "./oidcDiscovery.js";
import { oidcStateStore } from "./oidcStateStore.js";
import jwt from "jsonwebtoken";
import { extractRoles, mapAdfsRolesToUserRoles, extractGroups, mapAdfsGroupsToGroupIds } from "./adfsClaims.js";
import Group from "../models/Group.js";

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
          const defaultOrg = await Organization.findOne({
            name: process.env.OIDC_DEFAULT_ORG ?? "Al Siraat College",
          })
            .select("_id")
            .lean();

          let user = await User.findOne({ googleId: profile.id });
          if (!user) {
            // Check if user exists with same email
            const existingUser = await User.findOne({ email });
            if (existingUser) {
              existingUser.googleId = profile.id;
              if ((existingUser.organisations?.length ?? 0) === 0 && defaultOrg) {
                existingUser.organisations = [defaultOrg._id as mongoose.Types.ObjectId];
              }
              await existingUser.save();
              user = existingUser;
            } else {
              user = await User.create({
                name: profile.displayName,
                email,
                googleId: profile.id,
                avatar: profile.photos?.[0]?.value ?? "",
                ...(defaultOrg ? { organisations: [defaultOrg._id] } : {}),
                ...(defaultOrg
                  ? {
                      organisationRoles: [
                        { organisation: defaultOrg._id, roles: [UserRole.APPLICANT] },
                      ],
                    }
                  : {}),
              });
            }
          } else if ((user.organisations?.length ?? 0) === 0 && defaultOrg) {
            user.organisations = [defaultOrg._id as mongoose.Types.ObjectId];
            await user.save();
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
            scope: ["openid", "profile", "email", "allatclaims"],
            store: oidcStateStore as any, // in-memory store so state works without session cookie on IdP redirect
          },
          async (
            issuer: string,
            profile: OpenIDConnectProfile,
            context: object,
            idToken: string | object,
            accessToken: string | object,
            _refreshToken: string,
            _params: object,
            done: OpenIDConnectVerifyCallback,
          ) => {
            try {
              // Use email from ID token only (e.g. ADFS: email claim)
              const decodedIdToken = jwt.decode(idToken as string);
              const decoded = decodedIdToken && typeof decodedIdToken === "object" ? (decodedIdToken as Record<string, unknown>) : null;
              const email = typeof decoded?.email === "string" ? decoded.email : undefined;
              if (!email) {
                return done(new Error("No email found in ID token"));
              }

              // Extract role and group claims from ADFS tokens
              const adfsRoles = extractRoles(
                idToken,
                accessToken,
                profile as unknown as Record<string, unknown>,
              );
              const adfsGroups = extractGroups(
                idToken,
                accessToken,
                profile as unknown as Record<string, unknown>,
              );
              const [dbRoles, dbGroups, defaultOrg] = await Promise.all([
                Role.find({ isActive: true }).select("name oidcMapping").lean(),
                Group.find({ isActive: true }).select("name oidcMapping").lean(),
                Organization.findOne({
                  name: process.env.OIDC_DEFAULT_ORG ?? "Al Siraat College",
                }).select("_id").lean(),
              ]);
              const mappedRoles = mapAdfsRolesToUserRoles(adfsRoles, dbRoles);
              const mappedGroupIds = mapAdfsGroupsToGroupIds(adfsGroups, dbGroups as Array<{ _id: unknown; name: string; oidcMapping?: string[] }>);

              let user = await User.findOne({ oidcId: profile.id });
              if (user) {
                const name = decoded?.unique_name ? (decoded.unique_name as string) : "SSO User";
                let dirty = false;

                if (user.name !== name) {
                  user.name = name;
                  dirty = true;
                }

                if (user.email !== email) {
                  const existingUser = await User.findOne({ email, _id: { $ne: user._id } });
                  if (existingUser) {
                    return done(new Error("Email already in use by another user"));
                  }
                  user.email = email;
                  dirty = true;
                }

                // Update roles from ADFS if any mapped; otherwise preserve existing DB roles
                if (mappedRoles.length > 0) {
                  const targetOrgId =
                    user.organisations?.[0] || (defaultOrg?._id as mongoose.Types.ObjectId | undefined);
                  if (targetOrgId) {
                    const orgRoleIndex = (user.organisationRoles ?? []).findIndex(
                      (o: any) => o.organisation?.toString() === targetOrgId.toString(),
                    );
                    if (orgRoleIndex > -1 && user.organisationRoles) {
                      (user.organisationRoles as any)[orgRoleIndex].roles = mappedRoles;
                    } else {
                      user.organisationRoles = [
                        ...(user.organisationRoles ?? []),
                        { organisation: targetOrgId, roles: mappedRoles },
                      ] as any;
                    }
                  }
                  dirty = true;
                }

                // Assign default org if not already set
                if ((user.organisations?.length ?? 0) === 0 && defaultOrg) {
                  user.organisations = [defaultOrg._id as mongoose.Types.ObjectId];
                  dirty = true;
                }

                if (dirty) await user.save();
              } else {
                const existingUser = await User.findOne({ email });
                if (existingUser) {
                  existingUser.oidcId = profile.id;
                  if (mappedRoles.length > 0) {
                    const targetOrgId =
                      existingUser.organisations?.[0] ||
                      (defaultOrg?._id as mongoose.Types.ObjectId | undefined);
                    if (targetOrgId) {
                      const orgRoleIndex = (existingUser.organisationRoles ?? []).findIndex(
                        (o: any) =>
                          o.organisation?.toString() === targetOrgId.toString(),
                      );
                      if (orgRoleIndex > -1 && existingUser.organisationRoles) {
                        (existingUser.organisationRoles as any)[orgRoleIndex].roles =
                          mappedRoles;
                      } else {
                        existingUser.organisationRoles = [
                          ...(existingUser.organisationRoles ?? []),
                          { organisation: targetOrgId, roles: mappedRoles },
                        ] as any;
                      }
                    }
                  }
                  if ((existingUser.organisations?.length ?? 0) === 0 && defaultOrg) {
                    existingUser.organisations = [defaultOrg._id as mongoose.Types.ObjectId];
                  }
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
                    ...(defaultOrg ? { organisations: [defaultOrg._id] } : {}),
                    ...(defaultOrg
                      ? {
                          organisationRoles: [
                            {
                              organisation: defaultOrg._id,
                              roles:
                                mappedRoles.length > 0
                                  ? mappedRoles
                                  : [UserRole.APPLICANT],
                            },
                          ],
                        }
                      : {}),
                  });
                }
              }
              // Sync SSO-mapped groups: remove user from all groups, then add only to incoming SSO-mapped groups
              if (user) {
                const userId = (user as any)._id;
                await Group.updateMany(
                  { members: userId },
                  { $pull: { members: userId } },
                );
                for (const gid of mappedGroupIds) {
                  const group = await Group.findById(gid);
                  if (!group) continue;
                  const hasUser = group.members.some((m) => m.toString() === userId.toString());
                  if (!hasUser) {
                    group.members.push(userId as mongoose.Types.ObjectId);
                    await group.save();
                  }
                }
              }
              // Pass idToken to callback so it can be sent to frontend for localStorage
              const idTokenStr = typeof idToken === "string" ? idToken : (idToken ? JSON.stringify(idToken) : undefined);
              return done(null, user, idTokenStr ? { idToken: idTokenStr } : undefined);
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
