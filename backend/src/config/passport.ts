import passport from "passport";
import mongoose from "mongoose";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as OpenIDConnectStrategy, Profile as OpenIDConnectProfile, VerifyCallback as OpenIDConnectVerifyCallback } from "passport-openidconnect";
import bcrypt from "bcryptjs";
import User, { UserRole, OrgMemberKind } from "../models/User.js";
import { normalizeUserRole } from "../models/UserRole.js";
import Role from "../models/Role.js";
import { fetchOIDCConfiguration } from "./oidcDiscovery.js";
import { oidcStateStore } from "./oidcStateStore.js";
import jwt from "jsonwebtoken";
import { extractRoles, mapAdfsRolesToUserRoles, extractGroups, mapAdfsGroupsToGroupIds } from "./adfsClaims.js";
import Group from "../models/Group.js";
import { findAlSiraatOrganisation } from "../utils/alSiraatOrg.js";

type SsoUserLike = {
  isSuperAdmin?: boolean;
  organisations?: mongoose.Types.ObjectId[];
  organisationRoles?: Array<{
    organisation: mongoose.Types.ObjectId;
    roles: UserRole[];
    memberKind?: OrgMemberKind;
  }>;
};

/** Active system + org-scoped roles assignable in the given organisation. */
async function getOrganisationAssignableRoles(
  orgId: mongoose.Types.ObjectId,
): Promise<UserRole[]> {
  const roles = await Role.find({
    isActive: true,
    $or: [
      { organisation: orgId },
      { organisation: null },
      { organisation: { $exists: false } },
    ],
  })
    .select("name")
    .lean();

  const assignable = new Set<UserRole>();
  for (const role of roles) {
    const normalized = normalizeUserRole(role.name);
    if (Object.values(UserRole).includes(normalized as UserRole)) {
      assignable.add(normalized as UserRole);
    }
  }
  return Array.from(assignable);
}

/** On every SSO login, sync Al Siraat membership and org-scoped roles from IdP claims. */
function applySsoOrganisationMembership(
  user: SsoUserLike,
  defaultOrg: { _id: mongoose.Types.ObjectId } | null,
  mappedRoles: UserRole[],
  options: {
    grantSuperAdmin: boolean;
    isExistingUser: boolean;
    allOrgRoles: UserRole[];
  },
): void {
  if (!defaultOrg) return;

  const defaultOrgId = defaultOrg._id;
  const defaultOrgIdStr = defaultOrgId.toString();

  const otherOrgs = (user.organisations ?? []).filter(
    (id) => id.toString() !== defaultOrgIdStr,
  );
  user.organisations = [defaultOrgId, ...otherOrgs];

  const orgRoles = [...(user.organisationRoles ?? [])];
  const orgRoleIndex = orgRoles.findIndex(
    (entry) => entry.organisation?.toString() === defaultOrgIdStr,
  );
  const existingEntry = orgRoleIndex > -1 ? orgRoles[orgRoleIndex] : undefined;

  const isSuperAdmin = !!(user.isSuperAdmin || options.grantSuperAdmin);
  const roles =
    options.isExistingUser && isSuperAdmin && options.allOrgRoles.length > 0
      ? options.allOrgRoles
      : mappedRoles.length > 0
        ? mappedRoles
        : existingEntry?.roles?.length
          ? existingEntry.roles
          : [UserRole.APPLICANT];

  if (existingEntry) {
    orgRoles[orgRoleIndex] = {
      organisation: existingEntry.organisation,
      roles,
      memberKind: existingEntry.memberKind ?? OrgMemberKind.INTERNAL,
    };
  } else {
    orgRoles.push({
      organisation: defaultOrgId,
      roles,
      memberKind: OrgMemberKind.INTERNAL,
    });
  }
  user.organisationRoles = orgRoles;
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
                        {
                          organisation: defaultOrg._id,
                          roles: [UserRole.APPLICANT],
                          memberKind: OrgMemberKind.INTERNAL,
                        },
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
                findAlSiraatOrganisation(),
              ]);
              const allOrgRoles = defaultOrg
                ? await getOrganisationAssignableRoles(defaultOrg._id)
                : [];
              const mappedRoles = mapAdfsRolesToUserRoles(adfsRoles, dbRoles);
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

                applySsoOrganisationMembership(user, defaultOrg, mappedRoles, {
                  grantSuperAdmin,
                  isExistingUser: true,
                  allOrgRoles,
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
                    mappedRoles,
                    {
                      grantSuperAdmin,
                      isExistingUser: true,
                      allOrgRoles,
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
                  applySsoOrganisationMembership(user, defaultOrg, mappedRoles, {
                    grantSuperAdmin,
                    isExistingUser: false,
                    allOrgRoles,
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
