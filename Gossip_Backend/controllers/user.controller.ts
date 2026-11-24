import type { NextFunction, Request, Response } from "express";
import {
  searchUsers as searchUsersInDb,
  findUserById,
  findUsersByUids,
} from "../repository/user.repository.js";
import { getPendingRequestsForUser } from "../repository/friend-request.repository.js";
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

export const getPendingFriendRequests = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const user = await findUserById(res.locals.id);
    const pending = await getPendingRequestsForUser(user.uid);
    if (pending.length === 0) {
      return res.status(200).json({ requests: [] });
    }
    const senderUids = pending.map((r) => r.senderUid);
    const users = await findUsersByUids(senderUids);
    req.log?.info?.(
      { userid: res.locals.id, count: users.length },
      "Fetched pending friend requests",
    );
    return res.status(200).json({ requests: users });
  } catch (error) {
    next(error);
  }
};
