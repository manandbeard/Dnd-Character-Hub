import { getAuth } from "@clerk/express";
import type { Request, Response, NextFunction } from "express";
import { db, usersTable } from "@workspace/db";

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const auth = getAuth(req);
  const userId = (auth?.sessionClaims?.userId as string | undefined) || auth?.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  req.userId = userId;

  // Auto-upsert user so FK constraints on characters etc. are satisfied.
  // onConflictDoNothing means this is a cheap no-op for all subsequent requests.
  const email = (auth?.sessionClaims?.email as string | undefined) ?? `${userId}@user.local`;
  const name = (auth?.sessionClaims?.fullName as string | undefined) ??
    (auth?.sessionClaims?.firstName as string | undefined) ?? null;
  await db.insert(usersTable).values({ id: userId, email, name }).onConflictDoNothing();

  next();
}
