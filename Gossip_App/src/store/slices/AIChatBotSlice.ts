import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { AIChatMessage } from "../../types";
import { Tone, ToneValues } from "@gossip/shared";

export interface AIChatBotState {
  tones: Tone[];
  selectedTone: Tone;
  messages: AIChatMessage[];
}

const initialState: AIChatBotState = {
  tones: [...ToneValues],
  selectedTone: "formal",
  messages: [],
};

const AiChatBotSlice = createSlice({
  name: "chatbot",
  initialState,
  reducers: {
    changeTone: (state, action: PayloadAction<Tone>) => {
      state.selectedTone = action.payload;
    },
    addMessage: (
      state,
      action: PayloadAction<{ message: string; ai: boolean }>,
    ) => {
      const chat: AIChatMessage = {
        text: action.payload.message,
        ai: action.payload.ai,
        type: "text",
        time: Date.now(),
      };
      state.messages.push(chat);
    },
    clearMessages: (state) => {
      state.messages = [];
    },
  },
});

export const { addMessage, changeTone, clearMessages } = AiChatBotSlice.actions;
export default AiChatBotSlice.reducer;
