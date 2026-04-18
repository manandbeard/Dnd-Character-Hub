import { Router, type IRouter } from "express";
import { db, charactersTable, characterInventoryTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import {
  AddInventoryItemBody,
  UpdateInventoryItemBody,
  ListCharacterInventoryParams,
  AddInventoryItemParams,
  UpdateInventoryItemParams,
  RemoveInventoryItemParams,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

async function assertOwner(characterId: number, userId: string): Promise<boolean> {
  const [char] = await db.select({ id: charactersTable.id })
    .from(charactersTable)
    .where(and(eq(charactersTable.id, characterId), eq(charactersTable.userId, userId)));
  return !!char;
}

// GET /characters/:id/inventory
router.get("/characters/:id/inventory", requireAuth, async (req, res): Promise<void> => {
  const { userId } = req;
  const params = ListCharacterInventoryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const owns = await assertOwner(params.data.id, userId);
  if (!owns) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const items = await db.select().from(characterInventoryTable)
    .where(eq(characterInventoryTable.characterId, params.data.id))
    .orderBy(characterInventoryTable.createdAt);

  res.json(items);
});

// POST /characters/:id/inventory
router.post("/characters/:id/inventory", requireAuth, async (req, res): Promise<void> => {
  const { userId } = req;
  const params = AddInventoryItemParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const owns = await assertOwner(params.data.id, userId);
  if (!owns) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const parsed = AddInventoryItemBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [item] = await db.insert(characterInventoryTable).values({
    characterId: params.data.id,
    itemSlug: parsed.data.itemSlug,
    name: parsed.data.name,
    quantity: parsed.data.quantity ?? 1,
    notes: parsed.data.notes ?? "",
    isCustom: parsed.data.isCustom ?? false,
    customProperties: parsed.data.customProperties ?? {},
  }).returning();

  res.status(201).json(item);
});

// PATCH /characters/:id/inventory/:itemId
router.patch("/characters/:id/inventory/:itemId", requireAuth, async (req, res): Promise<void> => {
  const { userId } = req;
  const params = UpdateInventoryItemParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const owns = await assertOwner(params.data.id, userId);
  if (!owns) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const parsed = UpdateInventoryItemBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [item] = await db
    .update(characterInventoryTable)
    .set(parsed.data)
    .where(and(
      eq(characterInventoryTable.id, params.data.itemId),
      eq(characterInventoryTable.characterId, params.data.id),
    ))
    .returning();

  if (!item) {
    res.status(404).json({ error: "Inventory item not found" });
    return;
  }

  res.json(item);
});

// DELETE /characters/:id/inventory/:itemId
router.delete("/characters/:id/inventory/:itemId", requireAuth, async (req, res): Promise<void> => {
  const { userId } = req;
  const params = RemoveInventoryItemParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const owns = await assertOwner(params.data.id, userId);
  if (!owns) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const [item] = await db
    .delete(characterInventoryTable)
    .where(and(
      eq(characterInventoryTable.id, params.data.itemId),
      eq(characterInventoryTable.characterId, params.data.id),
    ))
    .returning();

  if (!item) {
    res.status(404).json({ error: "Inventory item not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
