import passport from "passport";
import mongoose from "mongoose";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as OpenIDConnectStrategy, Profile as OpenIDConnectProfile, VerifyCallback as OpenIDConnectVerifyCallback } from "passport-openidconnect";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import Role from "../models/Role.js";
import { fetchOIDCConfiguration } from "./oidcDiscovery.js";
import { oidcStateStore } from "./oidcStateStore.js";
import jwt from "jsonwebtoken";
import {
  extractRoles,
  mapAdfsRolesToRoleIds,
  type DbRoleOidcMappingRow,
  extractGroups,
  mapAdfsGroupsToGroupIds,
} from "./adfsClaims.js";
import Group from "../models/Group.js";
import { findAlSiraatOrganisation } from "../utils/alSiraatOrg.js";
import { DefaultRoleCode } from "@taskunity/shared/defaultRoleCodes.js";
import { catalogReadFilter } from "../utils/orgScopedCatalogRead.js";
import {
  resolveRoleCodeToIdFromCatalog,
  type RoleCatalogDocument,
} from "../services/orgMemberRoleResolver.js";
import { applySsoOrganisationMembership } from "../services/ssoOrganisationMembership.js";

function toRoleCatalogDocument(doc: {
  _id: unknown;
  code: string;
  name: string;
  permissions?: string[];
  isActive: boolean;
  organisation?: mongoose.Types.ObjectId | null;
}): RoleCatalogDocument {
  return {
    _id: doc._id as mongoose.Types.ObjectId,
    code: doc.code,
    name: doc.name,
    permissions: doc.permissions ?? [],
    isActive: doc.isActive,
    organisation: doc.organisation ?? null,
  };
}

type OrgRoleCatalogLoad = {
  catalog: RoleCatalogDocument[];
  oidcMappingRows: DbRoleOidcMappingRow[];
};

async function loadOrgRoleCatalog(
  orgId: mongoose.Types.ObjectId,
): Promise<OrgRoleCatalogLoad> {
  const docs = await Role.find({
    isActive: true,
    ...catalogReadFilter(orgId.toString()),
  })
    .select("_id code name permissions isActive organisation oidcMapping")
    .lean();
  return {
    catalog: docs.map((doc) => toRoleCatalogDocument(doc as any)),
    oidcMappingRows: docs.map((doc) => {
      const row: DbRoleOidcMappingRow = {
        _id: (doc as { _id: unknown })._id,
      };
      const mapping = (doc as { oidcMapping?: string[] }).oidcMapping;
      if (mapping?.length) row.oidcMapping = mapping;
      return row;
    }),
  };
}

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
          const defaultOrg = await findAlSiraatOrganisation();
          const { catalog } = defaultOrg
            ? await loadOrgRoleCatalog(defaultOrg._id as mongoose.Types.ObjectId)
            : { catalog: [] as RoleCatalogDocument[] };
          const defaultApplicantRoleId =
            defaultOrg && catalog.length > 0
              ? resolveRoleCodeToIdFromCatalog(
                  catalog,
                  DefaultRoleCode.APPLICANT,
                  defaultOrg._id.toString(),
                )
              : null;

          let user = await User.findOne({ googleId: profile.id });
          if (!user) {
            // Check if user exists with same email
            const existingUser = await User.findOne({ email });
            if (existingUser) {
              existingUser.googleId = profile.id;
              applySsoOrganisationMembership(
                existingUser,
                defaultOrg as { _id: mongoose.Types.ObjectId } | null,
                [],
                { defaultApplicantRoleId },
              );
              await existingUser.save();
              user = existingUser;
            } else {
              user = await User.create({
                name: profile.displayName,
                email,
                googleId: profile.id,
                avatar: profile.photos?.[0]?.value ?? "",
              });
              applySsoOrganisationMembership(
                user,
                defaultOrg as { _id: mongoose.Types.ObjectId } | null,
                defaultApplicantRoleId ? [defaultApplicantRoleId] : [],
                { defaultApplicantRoleId },
              );
              await user.save();
            }
          } else if ((user.organisations?.length ?? 0) === 0 && defaultOrg) {
            applySsoOrganisationMembership(
              user,
              defaultOrg as { _id: mongoose.Types.ObjectId } | null,
              [],
              { defaultApplicantRoleId },
            );
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
              const [defaultOrg, dbGroups] = await Promise.all([
                findAlSiraatOrganisation(),
                Group.find({ isActive: true }).select("name oidcMapping").lean(),
              ]);
              const { catalog, oidcMappingRows: dbRoles } = defaultOrg
                ? await loadOrgRoleCatalog(defaultOrg._id)
                : { catalog: [] as RoleCatalogDocument[], oidcMappingRows: [] };
              const orgIdStr = defaultOrg?._id?.toString() ?? "";
              const mappedRoleIds = mapAdfsRolesToRoleIds(adfsRoles, dbRoles, {
                organisationId: orgIdStr,
                catalog,
              });
              const defaultApplicantRoleId =
                defaultOrg && catalog.length > 0
                  ? resolveRoleCodeToIdFromCatalog(
                      catalog,
                      DefaultRoleCode.APPLICANT,
                      orgIdStr,
                    )
                  : null;
              const mappedGroupIds = mapAdfsGroupsToGroupIds(adfsGroups, dbGroups as Array<{ _id: unknown; name: string; oidcMapping?: string[] }>);
              const superAdminClaims =
                process.env.OIDC_SUPERADMIN_MAPPING?.split(",")
                  .map((s) => s.trim())
                  .filter(Boolean) ?? [];
              const grantSuperAdmin = adfsRoles.some((r) =>
                superAdminClaims.includes(r),
              );

              const displayName = decoded?.unique_name
                ? (decoded.unique_name as string)
                : "SSO User";

              let user = await User.findOne({ oidcId: profile.id });
              if (user) {
                if (user.name !== displayName) user.name = displayName;

                if (user.email !== email) {
                  const emailConflict = await User.findOne({
                    email,
                    _id: { $ne: user._id },
                  });
                  if (emailConflict) {
                    return done(new Error("Email already in use by another user"));
                  }
                  user.email = email;
                }

                applySsoOrganisationMembership(user, defaultOrg, mappedRoleIds, {
                  defaultApplicantRoleId,
                });

                if (grantSuperAdmin && !user.isSuperAdmin) {
                  user.isSuperAdmin = true;
                }

                await user.save();
              } else {
                const existingUser = await User.findOne({ email });
                if (existingUser) {
                  existingUser.oidcId = profile.id;
                  if (existingUser.name !== displayName) {
                    existingUser.name = displayName;
                  }

                  applySsoOrganisationMembership(
                    existingUser,
                    defaultOrg,
                    mappedRoleIds,
                    {
                      defaultApplicantRoleId,
                    },
                  );

                  if (grantSuperAdmin && !existingUser.isSuperAdmin) {
                    existingUser.isSuperAdmin = true;
                  }

                  await existingUser.save();
                  user = existingUser;

                  await User.updateMany(
                    { oidcId: profile.id, _id: { $ne: existingUser._id } },
                    { $unset: { oidcId: "" } },
                  );
                } else {
                  user = await User.create({
                    name: displayName,
                    email,
                    oidcId: profile.id,
                    isSuperAdmin: grantSuperAdmin,
                  });
                  applySsoOrganisationMembership(user, defaultOrg, mappedRoleIds, {
                    defaultApplicantRoleId,
                  });
                  await user.save();
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
