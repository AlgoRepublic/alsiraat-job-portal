import { Request, Response } from "express";

export const getSystemVersion = (_req: Request, res: Response) => {
  const version = process.env.APP_VERSION ?? "dev";
  return res.json({ version });
};
