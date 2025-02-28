import {Router} from "express";
import { College } from "../controller/college_class.js";

const router = Router();

router.get("/getAllColleges",College.getAllColleges);

router.post("/enlistCollege",College.enlistCollege);

export const college_router = router;