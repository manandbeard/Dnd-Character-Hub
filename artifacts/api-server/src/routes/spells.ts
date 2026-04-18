import { Router, type IRouter } from "express";
import { db, spellsTable } from "@workspace/db";
import { eq, ilike, and, type SQL } from "drizzle-orm";
import { ListSpellsQueryParams } from "@workspace/api-zod";
import { sql } from "drizzle-orm";

const router: IRouter = Router();

router.get("/spells", async (req, res): Promise<void> => {
  const params = ListSpellsQueryParams.safeParse(req.query);
  const filters: SQL[] = [];

  if (params.success) {
    if (params.data.level !== undefined) {
      filters.push(eq(spellsTable.level, params.data.level));
    }
    if (params.data.school) {
      filters.push(ilike(spellsTable.school, params.data.school));
    }
    if (params.data.class) {
      filters.push(sql`${spellsTable.classes} @> ${JSON.stringify([params.data.class])}::jsonb`);
    }
    if (params.data.search) {
      filters.push(ilike(spellsTable.name, `%${params.data.search}%`));
    }
  }

  const spells = filters.length > 0
    ? await db.select().from(spellsTable).where(and(...filters)).orderBy(spellsTable.level, spellsTable.name)
    : await db.select().from(spellsTable).orderBy(spellsTable.level, spellsTable.name);

  res.json(spells);
});

router.get("/spells/:slug", async (req, res): Promise<void> => {
  const slug = Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug;
  const [spell] = await db.select().from(spellsTable).where(eq(spellsTable.slug, slug));
  if (!spell) {
    res.status(404).json({ error: "Spell not found" });
    return;
  }
  res.json(spell);
});

export default router;
