import {Router} from "express";
import { Pg } from "../controller/pg_class.js";

const router = Router();

router.get("/getAllPg",Pg.getAllPg)
router.post("/addpg",Pg.addPg);

export const pg_router = router;