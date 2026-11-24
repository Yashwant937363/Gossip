import { Router } from "express";

import authUser from "../middlewares/authUser.middleware.js";
import {
  searchUsers,
  getPendingFriendRequests,
} from "../controllers/user.controller.js";

const router = Router();

router.get("/search", authUser, searchUsers);
router.get("/requests", authUser, getPendingFriendRequests);

export default router;
