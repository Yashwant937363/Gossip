import type { NextFunction, Request, Response } from "express";
import { uploadImage } from "../services/cloudinary.service.js";
import { UsersStore } from "../store/sessionStore.js";
import { removeFile } from "../utils/file.js";
import {
  APIError,
  GetFriendsAndChatsResponse,
  UploadChatImageResponse,
} from "@gossip/shared";
import {
  findUserById,
  findUsersByUids,
} from "../repository/user.repository.js";
import { getFriendUids } from "../repository/friend.repository.js";
import {
  getUserChatHistory,
  saveMessageTranslations,
} from "../repository/chat.repository.js";
import { translateMessages } from "../services/groq.service.js";
import { JWTPayload } from "../types/auth.types.js";

export const getFriendsandChats = async (
  req: Request,
  res: Response<GetFriendsAndChatsResponse | { error: string }, JWTPayload>,
  next: NextFunction,
) => {
  try {
    const user = await findUserById(res.locals.id);

    const uid = user.uid;
    const friendUids = await getFriendUids(uid);

    if (friendUids.length === 0) {
      return res.json({
        error: "no friends found",
      });
    }

    const offlineUids = [
      ...new Set(
        friendUids.filter((friendUid) => !UsersStore.getUser(friendUid)),
      ),
    ];

    const databaseUsers = await findUsersByUids(offlineUids);

    const databaseUserMap = new Map(
      databaseUsers.map((user) => [user.uid, user]),
    );

    const newFriends = friendUids.map((friendUid) => {
      const onlineUser = UsersStore.getUser(friendUid);

      if (onlineUser) {
        return {
          uid: onlineUser.uid,
          profile: onlineUser.profile,
          username: onlineUser.username,
          online: true,
        };
      }

      const databaseUser = databaseUserMap.get(friendUid);
      if (!databaseUser) {
        return {
          uid: friendUid,
          profile: "",
          username: "Unknown",
          online: false,
        };
      }
      return {
        uid: friendUid,
        profile: databaseUser.profile,
        username: databaseUser.username,
        online: false,
      };
    });

    const chats = await getUserChatHistory(uid);
    const targetLanguage = user.settings?.translation?.language;
    if (
      user.settings?.translation?.alwaysTranslate &&
      targetLanguage &&
      targetLanguage !== "original"
    ) {
      const inputTranslateText = chats
        .filter(
          (chat) =>
            chat.receiverUid === uid &&
            chat.type === "text" &&
            !chat.translatedText.some((t) => t?.language === targetLanguage),
        )
        .map((chat) => ({
          id: chat._id.toString(),
          text: chat.text,
        }));

      if (inputTranslateText.length > 0) {
        try {
          const translatedResult = await translateMessages({
            messages: inputTranslateText,
            to: targetLanguage,
          });

          if (translatedResult.messages.length > 0) {
            await saveMessageTranslations(
              translatedResult.language,
              translatedResult.messages,
              uid,
            );

            const translationMap = new Map(
              translatedResult.messages.map((m) => [m.id, m.translatedText]),
            );

            for (const chat of chats) {
              const translatedText = translationMap.get(chat._id.toString());
              if (translatedText) {
                chat.translatedText.push({
                  language: translatedResult.language,
                  translatedText,
                });
              }
            }
          }
        } catch (err) {
          req.log.warn(
            { err, uid },
            "Auto-translation during getFriendsandChats failed",
          );
        }
      }
    }
    req.log.info({ id: user.id }, "Friends Fetch Successful");
    res.status(200).json({ friends: newFriends, chats });
  } catch (error) {
    next(error);
  }
};

export const uploadChatImage = async (
  req: Request,
  res: Response<UploadChatImageResponse | APIError, JWTPayload>,
  next: NextFunction,
) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image file provided" });
    }

    const secureUrl = await uploadImage(req.file.path);

    req.log.info({ id: res.locals.id }, "Image Uploaded Successfully");
    return res.status(200).json({ success: true, url: secureUrl });
  } catch (error) {
    next(error);
  } finally {
    await removeFile(req.file?.path).catch(() => {});
  }
};
