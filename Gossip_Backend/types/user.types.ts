import { UserSettings } from "../schema/settings.schema.js";

export interface IUser {
  Username: string;
  FirstName: string;
  LastName: string;
  Email: string;
  uid: string;
  ProfilePicture: string;
  Password: string;
  settings: UserSettings;
}
