import { Router, type IRouter } from "express";
import { db, classesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/classes", async (_req, res): Promise<void> => {
  const classes = await db.select().from(classesTable).orderBy(classesTable.name);
  res.json(classes);
});

router.get("/classes/:slug", async (req, res): Promise<void> => {
  const slug = Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug;
  const [cls] = await db.select().from(classesTable).where(eq(classesTable.slug, slug));
  if (!cls) {
    res.status(404).json({ error: "Class not found" });
    return;
  }
  res.json(cls);
});

export default router;
