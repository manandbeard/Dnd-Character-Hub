import { Router, type IRouter } from "express";
import { db, itemsTable } from "@workspace/db";
import { eq, ilike, and, type SQL } from "drizzle-orm";
import { ListItemsQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/items", async (req, res): Promise<void> => {
  const params = ListItemsQueryParams.safeParse(req.query);
  const filters: SQL[] = [];

  if (params.success) {
    if (params.data.type) {
      filters.push(eq(itemsTable.type, params.data.type));
    }
    if (params.data.rarity) {
      filters.push(eq(itemsTable.rarity, params.data.rarity));
    }
    if (params.data.search) {
      filters.push(ilike(itemsTable.name, `%${params.data.search}%`));
    }
  }

  const items = filters.length > 0
    ? await db.select().from(itemsTable).where(and(...filters)).orderBy(itemsTable.name)
    : await db.select().from(itemsTable).orderBy(itemsTable.name);

  res.json(items);
});

router.get("/items/:slug", async (req, res): Promise<void> => {
  const slug = Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug;
  const [item] = await db.select().from(itemsTable).where(eq(itemsTable.slug, slug));
  if (!item) {
    res.status(404).json({ error: "Item not found" });
    return;
  }
  res.json(item);
});

export default router;
