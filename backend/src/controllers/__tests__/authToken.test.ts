import test from "node:test";
import assert from "node:assert";
import jwt from "jsonwebtoken";
import { generateToken } from "../authController.ts";

const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret_here";

test("generateToken embeds act_org claim", () => {
  const token = generateToken(
    {
      _id: "507f191e810c19729de860ea",
      roles: ["Applicant"],
      organisations: ["507f191e810c19729de860eb"],
    },
    "507f191e810c19729de860eb",
  );

  const decoded = jwt.verify(token, JWT_SECRET) as any;
  assert.equal(decoded.id, "507f191e810c19729de860ea");
  assert.equal(decoded.act_org, "507f191e810c19729de860eb");
});

test("generateToken falls back to first organisation when org not provided", () => {
  const token = generateToken({
    _id: "507f191e810c19729de860ea",
    roles: ["Applicant"],
    organisations: ["507f191e810c19729de860ec"],
  });
  const decoded = jwt.verify(token, JWT_SECRET) as any;
  assert.equal(decoded.act_org, "507f191e810c19729de860ec");
});
