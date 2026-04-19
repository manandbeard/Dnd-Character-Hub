import { Router, type IRouter } from "express";
import healthRouter from "./health";
import usersRouter from "./users";
import charactersRouter from "./characters";
import inventoryRouter from "./inventory";
import racesRouter from "./races";
import classesRouter from "./classes";
import backgroundsRouter from "./backgrounds";
import spellsRouter from "./spells";
import itemsRouter from "./items";
import campaignsRouter from "./campaigns";
import aiRouter from "./ai";
import socialRouter from "./social";

const router: IRouter = Router();

router.use(healthRouter);
router.use(usersRouter);
router.use(charactersRouter);
router.use(inventoryRouter);
router.use(racesRouter);
router.use(classesRouter);
router.use(backgroundsRouter);
router.use(spellsRouter);
router.use(itemsRouter);
router.use(campaignsRouter);
router.use(aiRouter);
router.use(socialRouter);

export default router;
