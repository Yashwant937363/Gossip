import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface UIState {
  openedchat: any;
  previousPath: string;
  isEditorOpen: boolean;
}

const initialState: UIState = {
  openedchat: false,
  previousPath: "/chat",
  isEditorOpen: false,
};

const UISlice = createSlice({
  name: "UIState",
  initialState,
  reducers: {
    changeOpenedChat: (state, action: PayloadAction<any>) => {
      state.openedchat = action.payload;
    },
    changePreviousPath: (state, action: PayloadAction<string>) => {
      state.previousPath = action.payload;
    },
    setEditorOpen: (state, action: PayloadAction<boolean>) => {
      state.isEditorOpen = action.payload;
    },
  },
});

export const {
  changeOpenedChat,
  changePreviousPath,
  setEditorOpen,
} = UISlice.actions;
export default UISlice.reducer;
