import type { UserSettings } from "../schemas/settings.schema";

export interface IUser {
  Username: string;
  FirstName: string;
  LastName: string;
  Email: string;
  uid: string;
  ProfilePicture: string;
  Password?: string;
  settings: UserSettings;
}
