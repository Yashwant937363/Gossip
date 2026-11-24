import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import Cookies from "js-cookie";
import {
  apiGetUser,
  apiSignIn,
  apiSignUp,
  apiGetFriendRequests,
  getAuthToken,
} from "../../api/client";
import {
  APIError,
  GetUserResponse,
  SigninReq,
  SigninResponse,
  SignupResponse,
  SummarizationFormat,
  UserSettings,
  SearchUserItem,
} from "@gossip/shared";
import { notify } from "../../utils/notify";
import axios from "axios";
import { getApiErrorMessage } from "../../api/api-error";
import { BaseUser, IPublicUser } from "@gossip/shared/schemas/user.schema";

export interface UserState extends IPublicUser {
  authtoken: string;
  online: boolean;
  isLogin: boolean;
  isPending: boolean;
  requests: SearchUserItem[];
}

const initialState: UserState = {
  profile: "",
  firstname: null,
  lastname: null,
  username: "",
  email: "",
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

export const signUpUser = createAsyncThunk<
  SignupResponse,
  { signUpData: FormData },
  { rejectValue: APIError }
>("user/signupuser", async ({ signUpData }, { rejectWithValue }) => {
  try {
    const data = await apiSignUp(signUpData);
    Cookies.set("authtoken", data.authtoken, { expires: 365 });
    notify.success("Sign Up Successful", "Welcome to Gossip!");

    return data;
  } catch (error: any) {
    const message = getApiErrorMessage(
      error,
      "Failed to signup, Try again after some time",
    );

    notify.error("Sign Up", message);

    return rejectWithValue({ error: message });
  }
});

export const signInUser = createAsyncThunk<
  SigninResponse,
  { signInData: SigninReq },
  { rejectValue: APIError }
>("user/signinuser", async ({ signInData }, { rejectWithValue }) => {
  try {
    const data = await apiSignIn(signInData);
    Cookies.set("authtoken", data.authtoken, { expires: 365 });
    notify.success("Signed In", "Welcome back!");
    return data;
  } catch (error: any) {
    const message = getApiErrorMessage(
      error,
      "Failed to signin, Try again after some time",
    );

    notify.error("Sign In", message);

    return rejectWithValue({ error: message });
  }
});

export const getUser = createAsyncThunk<
  GetUserResponse,
  { authtoken: string },
  { rejectValue: APIError }
>("user/getuser", async ({ authtoken }, { rejectWithValue }) => {
  try {
    const data = await apiGetUser(authtoken);
    return data;
  } catch (error: any) {
    const message = getApiErrorMessage(error);

    notify.error("Auto Login", message);

    return rejectWithValue({ error: message });
  }
});

export const fetchFriendRequests = createAsyncThunk<
  SearchUserItem[],
  { authtoken?: string }
>("user/fetchFriendRequests", async ({ authtoken }) => {
  try {
    const data = await apiGetFriendRequests(authtoken);
    return data.requests || [];
  } catch (error: any) {
    return [];
  }
});

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    clear: (state) => {
      state.profile = null;
      state.firstname = null;
      state.lastname = null;
      state.username = "";
      state.email = "";
      state.authtoken = "";
      state.uid = "";
      state.online = false;
      state.isLogin = false;
      state.requests = [];
      Cookies.remove("authtoken");
    },
    setSignUpDetails: (
      state,
      action: PayloadAction<Omit<BaseUser, "settings">>,
    ) => {
      const { firstname, lastname, username, email, profile } = action.payload;
      state.firstname = firstname;
      state.lastname = lastname;
      state.username = username;

      state.email = email;
      state.profile = profile;
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
    changeSummarizationFormat: (
      state,
      action: PayloadAction<SummarizationFormat>,
    ) => {
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
      const data = action.payload;
      state.authtoken = data.authtoken;
      state.uid = data.uid;
      state.isLogin = true;
    });
    builder.addCase(signUpUser.rejected, (state) => {
      state.isPending = false;
    });

    // SignIn User
    builder.addCase(signInUser.pending, (state) => {
      state.isPending = true;
    });
    builder.addCase(signInUser.fulfilled, (state, action) => {
      Object.assign(state, action.payload);
      state.isLogin = true;
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

      Object.assign(state, action.payload.user);
      state.authtoken = getAuthToken();
      state.isLogin = true;
    });
    builder.addCase(getUser.rejected, (state) => {
      state.isPending = false;
      Cookies.remove("authtoken");
    });

    // Fetch Friend Requests
    builder.addCase(fetchFriendRequests.fulfilled, (state, action) => {
      state.requests = action.payload || [];
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
