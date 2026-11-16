import type { Request, Response } from "express";
import {
  createUser,
  findUserByEmail,
  findUserById,
} from "../repository/user.repository.js";
import { nanoid } from "nanoid";
import { SigninReq, SignupReq } from "@gossip/shared";
import { compareHash, getHash } from "../services/bcrypt.service.js";
import { generateToken } from "../services/jwt.service.js";
import { generateEmailOtp, sendEmailOtp } from "../services/email.service.js";
import { processAndUploadImage } from "../services/image.service.js";
import { GetUserResponse } from "@gossip/shared";
import { JWTPayload } from "../types/auth.types.js";

export const getUser = async (
  req: Request,
  res: Response<GetUserResponse | { error: string }, JWTPayload>,
) => {
  const user = await findUserById(res.locals.id);
  if (user) {
    return res.status(200).json({
      msg: "Sussessfully Login",
      user: {
        profile: user.profile,
        username: user.username,
        firstname: user.firstname,
        lastname: user.lastname,
        email: user.email,
        uid: user.uid,
        settings: user.settings,
      },
    });
  }
  return res.status(404).json({ error: "Automatic Login Failed" });
};

export const signupUser = async (
  req: Request<{}, {}, SignupReq>,
  res: Response,
) => {
  let url = "";
  try {
    const existingUser = await findUserByEmail(req.body.email);
    if (existingUser) {
      return res
        .status(401)
        .json({ error: "Please Enter Unique Email Address" });
    }
    if (req.file) {
      const inputimagepath = `./assets/profile/${req.file.filename}`;
      const outputimagepath = `./assets/profile/${req.body.email}.png`;
      try {
        url = await processAndUploadImage(inputimagepath, outputimagepath);
      } catch (sharperror) {
        console.log("Error while processing image Sharp Error :", sharperror);
        return res.status(500).json({ error: "Image Processing Error" });
      }
    }

    const password = await getHash(req.body.password);

    const newUser = await createUser({
      profile: req.file ? url : "",
      username: req.body.username,
      firstname: req.body.firstname,
      lastname: req.body.lastname,
      email: req.body.email,
      password: password,
      uid: nanoid(5),
    });
    const authtoken = generateToken<JWTPayload>({ id: newUser.id });
    res.status(201).json({ authtoken: authtoken, uid: newUser.uid });
  } catch (error) {
    console.log("Server Error : " + error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const signinUser = async (
  req: Request<{}, {}, SigninReq>,
  res: Response,
) => {
  try {
    const user = await findUserByEmail(req.body.email);

    console.log(req.body.password, user);
    if (!user) {
      return res.status(401).json({ error: "Login with correct Credentials" });
    }
    const passwordCompare = await compareHash(req.body.password, user.password);
    if (!passwordCompare) {
      return res.status(401).json({ error: "Login with correct Credentials" });
    }

    const authtoken = generateToken<JWTPayload>({ id: user.id });
    // Check and send the file if it exists
    res.status(200).json({
      authtoken,
      msg: "Login Successful",
      profile: user.profile,
      username: user.username,
      fullname: { firstname: user.firstname, lastname: user.lastname },
      uid: user.uid,
      settings: user.settings,
    });
  } catch (err) {
    console.log("Error while Login User : ", err);
    res.status(500).json({ error: "Server Crashed" });
  }
};

export const sendEmailOtpController = async (req: Request, res: Response) => {
  try {
    const otp = generateEmailOtp();

    await sendEmailOtp(req.body.email, otp);

    return res.status(200).json({
      success: true,
      message: "Email sent successfully",
    });
  } catch (error) {
    console.error("Failed to send email:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to send email",
    });
  }
};
