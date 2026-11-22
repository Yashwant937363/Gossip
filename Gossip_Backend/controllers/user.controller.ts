import type { NextFunction, Request, Response } from "express";
import { searchUsers as searchUsersInDb } from "../repository/user.repository.js";
import type { JWTPayload } from "../types/auth.types.js";
import { APIError, SearchUsersResponse } from "@gossip/shared";

export const searchUsers = async (
  req: Request,
  res: Response<SearchUsersResponse | APIError, JWTPayload>,
  next: NextFunction,
) => {
  try {
    const query = req.query.q as string;

    if (!query?.trim()) {
      return res.status(400).json({ error: "Search query is required" });
    }

    const users = await searchUsersInDb(query);
    req.log.info({ userid: res.locals.id }, "Sucess Search Users");
    return res.status(200).json({ users });
  } catch (error) {
    next(error);
  }
};
