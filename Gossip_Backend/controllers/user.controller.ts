import type { Request, Response } from "express";
import { searchUsers as searchUsersInDb } from "../repository/user.repository.js";
import type { JWTPayload } from "../types/auth.types.js";
import { APIError, SearchUsersResponse } from "@gossip/shared";

export const searchUsers = async (
  req: Request,
  res: Response<SearchUsersResponse | APIError, JWTPayload>,
) => {
  try {
    const query = req.query.q as string;

    if (!query?.trim()) {
      return res.status(400).json({ error: "Search query is required" });
    }

    const users = await searchUsersInDb(query);

    return res.status(200).json({ msg: "ok", users });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ error: "Something went wrong while fetching user data" });
  }
};
