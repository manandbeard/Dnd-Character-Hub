import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { db, usersTable } from "@workspace/db";
import { UpdateMeBody, GetMeResponse, UpdateMeResponse } from "@workspace/api-zod";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

// GET /users/me — get or auto-create user profile
router.get("/users/me", requireAuth, async (req, res): Promise<void> => {
  const { userId } = req;
  const auth = getAuth(req);

  let [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));

  if (!user) {
    // Auto-create user on first access
    const email = (auth?.sessionClaims?.email as string | undefined) || `${userId}@user.local`;
    const name = (auth?.sessionClaims?.fullName as string | undefined) ||
      (auth?.sessionClaims?.firstName as string | undefined) || null;

    [user] = await db.insert(usersTable).values({
      id: userId,
      email,
      name,
    }).returning();
  }

  res.json(GetMeResponse.parse(user));
});

// PATCH /users/me — update user profile
router.patch("/users/me", requireAuth, async (req, res): Promise<void> => {
  const { userId } = req;
  const parsed = UpdateMeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [user] = await db
    .update(usersTable)
    .set(parsed.data)
    .where(eq(usersTable.id, userId))
    .returning();

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json(UpdateMeResponse.parse(user));
});

export default router;
