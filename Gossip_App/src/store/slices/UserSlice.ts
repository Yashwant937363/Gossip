import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import Cookies from "js-cookie";
import {
  apiGetUser,
  apiSignIn,
  apiSignUp,
  getAuthToken,
} from "../../api/client";
import { UserSettings } from "../../types";
import { notify } from "../../utils/notify";

export interface UserState {
  profile: string | null;
  fullname: { firstname: string; lastname: string } | null;
  username: string;
  email: string;
  dob: string | null;
  authtoken: string;
  uid: string;
  settings: UserSettings;
  online: boolean;
  isLogin: boolean;
  isPending: boolean;
  requests: any[];
}

const initialState: UserState = {
  profile: "",
  fullname: null,
  username: "",
  email: "",
  dob: null,
  authtoken: "",
  uid: "",
  settings: {
    translation: {
      language: "original",
      alwaysTranslate: false,
    },
    summarization: {
      format: "paragraph",
    },
  },
  online: false,
  isLogin: false,
  isPending: false,
  requests: [],
};

export const signUpUser = createAsyncThunk(
  "user/signupuser",
  async ({ signUpData }: { signUpData: FormData }, { dispatch }) => {
    try {
      const data = await apiSignUp(signUpData);
      if (data?.data?.authtoken) {
        Cookies.set("authtoken", data.data.authtoken, { expires: 365 });
        dispatch(getUser({ authtoken: data.data.authtoken }));
        notify.success("Sign Up Successful", "Welcome to Gossip!");
      }
      return { data, status: 200 };
    } catch (error: any) {
      console.log("SignUP Error: ", error);
      const errMsg =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        "Sign up failed";
      notify.error("Sign Up Failed", errMsg);
      return { data: { error: errMsg }, status: error.response?.status || 500 };
    }
  },
);

export const signInUser = createAsyncThunk(
  "user/signinuser",
  async ({ signInData }: { signInData: any }, { dispatch }) => {
    try {
      const data = await apiSignIn(signInData);
      if (data?.data?.authtoken) {
        Cookies.set("authtoken", data.data.authtoken, { expires: 365 });
        dispatch(getUser({ authtoken: data.data.authtoken }));
        notify.success("Signed In", "Welcome back!");
      }
      return { data, status: 200 };
    } catch (error: any) {
      console.log("SignIn Error: ", error);
      const errMsg =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        "Sign in failed";
      notify.error("Sign In Failed", errMsg);
      return { data: { error: errMsg }, status: error.response?.status || 500 };
    }
  },
);

export const getUser = createAsyncThunk(
  "user/getuser",
  async ({ authtoken }: { authtoken: string }) => {
    try {
      const data = await apiGetUser(authtoken);
      return { data, status: 200 };
    } catch (error: any) {
      console.log("GetUser Error: ", error);
      const errMsg =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message;
      return { data: { error: errMsg }, status: error.response?.status || 500 };
    }
  },
);

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    clear: (state) => {
      state.profile = null;
      state.fullname = null;
      state.username = "";
      state.email = "";
      state.dob = null;
      state.authtoken = "";
      state.uid = "";
      state.online = false;
      state.isLogin = false;
      Cookies.remove("authtoken");
    },
    setSignUpDetails: (
      state,
      action: PayloadAction<{
        fullname: any;
        username: string;
        email: string;
        date: string;
        profile?: string | null;
      }>,
    ) => {
      const { fullname, username, email, date } = action.payload;
      state.fullname = fullname;
      state.username = username;
      state.email = email;
      state.dob = date;
    },
    setSignInDetails: (state, action: PayloadAction<string>) => {
      state.email = action.payload;
    },
    setAuthtoken: (state, action: PayloadAction<string>) => {
      state.authtoken = action.payload;
      if (action.payload) {
        state.isLogin = true;
      }
    },
    setProfile: (state, action: PayloadAction<string>) => {
      state.profile = action.payload;
    },
    setOnline: (state, action: PayloadAction<boolean>) => {
      state.online = action.payload;
    },
    changeLanguage: (state, action: PayloadAction<string>) => {
      state.settings.translation.language = action.payload;
    },
    changeAlwaysTranslate: (state, action: PayloadAction<boolean>) => {
      state.settings.translation.alwaysTranslate = action.payload;
    },
    changeSummarizationFormat: (state, action: PayloadAction<string>) => {
      state.settings.summarization.format = action.payload;
    },
    addRequest: (state, action: PayloadAction<any>) => {
      const { uid } = action.payload;
      const exists = state.requests.some((r) => r.uid === uid);
      if (!exists) {
        state.requests.push(action.payload);
      }
    },
    removeRequest: (state, action: PayloadAction<string>) => {
      const fromuid = action.payload;
      const index = state.requests.findIndex((r) => r.uid === fromuid);
      if (index !== -1) {
        state.requests.splice(index, 1);
      }
    },
  },
  extraReducers: (builder) => {
    // SignUp User
    builder.addCase(signUpUser.pending, (state) => {
      state.isPending = true;
    });
    builder.addCase(signUpUser.fulfilled, (state, action) => {
      state.isPending = false;
      const { data, status } = action.payload;
      if (status >= 200 && status < 300 && data?.data?.authtoken) {
        state.authtoken = data.data.authtoken;
        Cookies.set("authtoken", action.payload.data.authtoken, {
          expires: 365,
        });
        state.uid = data.user_id || state.uid;
        state.isLogin = true;
      }
    });
    builder.addCase(signUpUser.rejected, (state) => {
      state.isPending = false;
    });

    // SignIn User
    builder.addCase(signInUser.pending, (state) => {
      state.isPending = true;
    });
    builder.addCase(signInUser.fulfilled, (state, action) => {
      if (action.payload.status < 300 && action.payload.status >= 200) {
        const { profile, authtoken, dob, fullname, uid, username, settings } =
          action.payload.data;
        state.profile = profile;
        state.authtoken = authtoken;
        Cookies.set("authtoken", authtoken, { expires: 365 });
        state.dob = dob;
        state.fullname = fullname;
        state.username = username;
        state.uid = uid;
        state.settings = settings;
        state.isLogin = true;
      }
      state.isPending = false;
    });
    builder.addCase(signInUser.rejected, (state) => {
      state.isPending = false;
    });

    // Get User
    builder.addCase(getUser.pending, (state) => {
      state.isPending = true;
    });
    builder.addCase(getUser.fulfilled, (state, action) => {
      state.isPending = false;
      const { data, status } = action.payload;
      if (status >= 200 && status < 300 && data) {
        const user = data.user || data;
        state.username = user.Username || user.username || state.username;
        state.email = user.Email || user.email || state.email;
        state.uid = user.uid || user._id || state.uid;
        state.profile = user.ProfilePicture || user.profile || state.profile;
        if (user.firstname || user.lastname) {
          state.fullname = {
            firstname: user.firstname || "",
            lastname: user.lastname || "",
          };
        }
        if (user.dob) {
          state.dob = user.dob;
        }
        if (user.settings) {
          state.settings = {
            translation: {
              language: user.settings.translation?.language || "original",
              alwaysTranslate: !!user.settings.translation?.alwaysTranslate,
            },
            summarization: {
              format: user.settings.summarization?.format || "paragraph",
            },
          };
        }
        state.authtoken = getAuthToken();
        state.isLogin = true;
      } else {
        Cookies.remove("authtoken");
      }
    });
    builder.addCase(getUser.rejected, (state) => {
      state.isPending = false;
      Cookies.remove("authtoken");
    });
  },
});

export const {
  clear,
  setSignUpDetails,
  setSignInDetails,
  setAuthtoken,
  setOnline,
  setProfile,
  addRequest,
  changeLanguage,
  changeAlwaysTranslate,
  removeRequest,
  changeSummarizationFormat,
} = userSlice.actions;

export default userSlice.reducer;
