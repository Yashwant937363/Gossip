import type { NextFunction, Request, Response } from "express";
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
import {
  EmailAlreadyExistsError,
  InvalidCredentialsError,
} from "../errors/index.js";
import { removeFile } from "../utils/file.js";

export const getUser = async (
  req: Request,
  res: Response<GetUserResponse | { error: string }, JWTPayload>,
  next: NextFunction,
) => {
  try {
    const user = await findUserById(res.locals.id);

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
  } catch (e) {
    next(e);
  }
};

export const signupUser = async (
  req: Request<{}, {}, SignupReq>,
  res: Response,
  next: NextFunction,
) => {
  let url = "";
  try {
    const existingUser = await findUserByEmail(req.body.email);
    if (existingUser) {
      throw new EmailAlreadyExistsError();
    }
    if (req.file) {
      const inputImagePath = req.file.path;
      const outputImagePath = `${inputImagePath}.png`;

      url = await processAndUploadImage(inputImagePath, outputImagePath);
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
    req.log.info({ id: newUser.id }, "User Created Successfully");
    res.status(201).json({ authtoken: authtoken, uid: newUser.uid });
  } catch (error) {
    next(error);
  } finally {
    await removeFile(req.file?.path).catch(() => {});
  }
};

export const signinUser = async (
  req: Request<{}, {}, SigninReq>,
  res: Response,
  next: NextFunction,
) => {
  try {
    const user = await findUserByEmail(req.body.email);

    if (!user) {
      throw new InvalidCredentialsError();
    }
    const passwordCompare = await compareHash(req.body.password, user.password);
    if (!passwordCompare) {
      throw new InvalidCredentialsError();
    }

    const authtoken = generateToken<JWTPayload>({ id: user.id });
    req.log.info({ id: user.id }, "Login Successful");
    res.status(200).json({
      authtoken,
      msg: "Login Successful",
      profile: user.profile,
      username: user.username,
      fullname: { firstname: user.firstname, lastname: user.lastname },
      uid: user.uid,
      settings: user.settings,
    });
  } catch (error) {
    next(error);
  }
};

export const sendEmailOtpController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const otp = generateEmailOtp();
    await sendEmailOtp(req.body.email, otp);
    req.log.info("OTP Email sent successfully");
    return res.status(200).json({
      message: "Email sent successfully",
    });
  } catch (error) {
    next(error);
  }
};
