import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import User, { UserRole } from "../models/User.js";

const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret_here";

export const authenticate = async (
  req: any,
  res: Response,
  next: NextFunction,
) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");

  if (!token)
    return res
      .status(401)
      .json({ message: "No authentication token, authorization denied" });

  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) return res.status(401).json({ message: "User not found" });

    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ message: "Token is not valid" });
  }
};

export const authorize = (roles: UserRole[]) => {
  return (req: any, res: Response, next: NextFunction) => {
    if (!roles.includes(req.user.role)) {
      return res
        .status(403)
        .json({ message: "User not authorized to perform this action" });
    }
    next();
  };
};

export const checkImpersonation = (
  req: any,
  res: Response,
  next: NextFunction,
) => {
  // Only Admin can impersonate
  if (req.header("x-impersonate-role") && req.user.role !== UserRole.ADMIN) {
    return res
      .status(403)
      .json({ message: "Only Admin can impersonate roles" });
  }

  if (req.header("x-impersonate-role") && req.user.role === UserRole.ADMIN) {
    req.impersonatedRole = req.header("x-impersonate-role");
  }
  next();
};
