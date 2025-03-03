import {Router} from "express";
import { Pg } from "../controller/pg_class.js";

const router = Router();

router.get("/getAllPg",Pg.getAllPg)
router.get("/getPg/:id",Pg.getPg)
router.post("/addpg",Pg.addPg);
router.delete("/deletePg/:id",Pg.deletePg)
router.put("/updatePg/:id", Pg.updatePg);

export const pg_router = router;