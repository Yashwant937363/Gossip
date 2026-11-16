//api/auth/
import { Router } from "express";
import authUser from "../middlewares/authUser.middleware.js";
import upload from "../middlewares/upload.middleware.js";
import { validateBody } from "../middlewares/validateBody.middleware.js";
import { signinReqSchema, signupReqSchema } from "@gossip/shared";

import {
  getUser,
  signinUser,
  signupUser,
  sendEmailOtpController,
} from "../controllers/auth.controller.js";

const router = Router();
router.post("/getuser", authUser, getUser);

router.post(
  "/signup",
  upload.single("profile"),
  validateBody(signupReqSchema),
  signupUser,
);

router.post(
  "/signin",
  upload.none(),
  validateBody(signinReqSchema),
  signinUser,
);

router.post("/send-email-otp", sendEmailOtpController);

export default router;
