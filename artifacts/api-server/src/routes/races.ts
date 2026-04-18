import { Router, type IRouter } from "express";
import { db, racesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/races", async (_req, res): Promise<void> => {
  const races = await db.select().from(racesTable).orderBy(racesTable.name);
  res.json(races);
});

router.get("/races/:slug", async (req, res): Promise<void> => {
  const slug = Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug;
  const [race] = await db.select().from(racesTable).where(eq(racesTable.slug, slug));
  if (!race) {
    res.status(404).json({ error: "Race not found" });
    return;
  }
  res.json(race);
});

export default router;
