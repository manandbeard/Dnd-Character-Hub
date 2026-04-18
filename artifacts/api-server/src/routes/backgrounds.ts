import { Router, type IRouter } from "express";
import { db, backgroundsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/backgrounds", async (_req, res): Promise<void> => {
  const backgrounds = await db.select().from(backgroundsTable).orderBy(backgroundsTable.name);
  res.json(backgrounds);
});

router.get("/backgrounds/:slug", async (req, res): Promise<void> => {
  const slug = Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug;
  const [bg] = await db.select().from(backgroundsTable).where(eq(backgroundsTable.slug, slug));
  if (!bg) {
    res.status(404).json({ error: "Background not found" });
    return;
  }
  res.json(bg);
});

export default router;
