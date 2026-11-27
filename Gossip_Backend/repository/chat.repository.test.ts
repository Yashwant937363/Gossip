import mongoose from "mongoose";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Chat from "../models/chat.model.js";
import { saveMessageTranslations } from "./chat.repository.js";

describe("saveMessageTranslations ownership filter", () => {
  const mockBulkWrite = vi.spyOn(Chat, "bulkWrite");

  beforeEach(() => {
    vi.clearAllMocks();
    mockBulkWrite.mockResolvedValue({} as any);
  });

  it("includes senderUid/receiverUid ownership condition in bulkWrite filters", async () => {
    const msgId = new mongoose.Types.ObjectId().toString();

    await saveMessageTranslations(
      "es",
      [{ id: msgId, translatedText: "hola" }],
      "userA",
    );

    expect(mockBulkWrite).toHaveBeenCalledOnce();
    const [ops] = mockBulkWrite.mock.calls[0];
    expect((ops[0] as any).updateOne.filter).toEqual({
      _id: new mongoose.Types.ObjectId(msgId),
      $or: [{ senderUid: "userA" }, { receiverUid: "userA" }],
    });
  });
});
