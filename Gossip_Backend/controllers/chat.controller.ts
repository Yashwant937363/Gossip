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
import { getUserChatHistory } from "../repository/chat.repository.js";
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

    let chats = await getUserChatHistory(uid);
    // if (
    //   user.settings.translation.alwaysTranslate &&
    //   user.settings.translation.language !== "original"
    // ) {
    //   const filterChatsForTranslation = chats.filter(
    //     (chat) =>
    //       chat.Receiver_ID === uid &&
    //       chat.type === "text" &&
    //       !chat.translatedText.some(
    //         (t) => t?.language === user.settings.translation.language,
    //       ),
    //   );
    //   const inputTranslateText = filterChatsForTranslation.map((chat) => {
    //     return {
    //       id: chat._id.toString(),
    //       text: chat.text,
    //     };
    //   });
    //   const translatedReceivedChats = await translateMultipleMessages({
    //     messages: inputTranslateText,
    //     to: user.settings.translation.language,
    //   });
    //   const { messages, language } = translatedReceivedChats;
    //   if (translatedReceivedChats) {
    //     chats = chats.map((chat) => {
    //       const translatedText = messages.find(
    //         (message) => message.id === chat._id.toString(),
    //       );
    //       if (translatedText) {
    //         chat.translatedText.push({
    //           language,
    //           translatedText: translatedText.translatedText,
    //         });
    //       }
    //       return chat;
    //     });
    //   }
    // }
    // console.log("Updated", chats);
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
