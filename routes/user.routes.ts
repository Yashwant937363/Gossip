import { Router } from "express";

import authUser from "../middlewares/authUser.middleware.js";
import { searchUsers } from "../controllers/user.controller.js";

const router = Router();

router.get("/search", authUser, searchUsers);

export default router;
