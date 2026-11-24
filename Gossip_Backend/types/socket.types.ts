import type { Server, Socket } from "socket.io";
import type { UserSession } from "@gossip/shared";
import {
  ClientToServerEventsTypes,
  ServerToClientEventsTypes,
} from "@gossip/shared";
import { Logger } from "pino";

export interface SocketData {
  id: string; // Mongo user ObjectId string
  uid: string; // User 5-char unique ID
  user: UserSession; // User document or session
  log: Logger;
}

export interface InterServerEvents {}

export type ClientHandler<E extends keyof ClientToServerEventsTypes> =
  ClientToServerEventsTypes[E];

export type TypedServer = Server<
  ClientToServerEventsTypes,
  ServerToClientEventsTypes,
  InterServerEvents,
  SocketData
>;

export type TypedSocket = Socket<
  ClientToServerEventsTypes,
  ServerToClientEventsTypes,
  InterServerEvents,
  SocketData
>;
