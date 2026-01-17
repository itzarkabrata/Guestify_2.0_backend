import {Router} from "express";
import { Contact } from "../../controller/contact_class.js";

const router = Router();

router.get("/contact/query", Contact.sendQuery);

export const contact_us_router = router;