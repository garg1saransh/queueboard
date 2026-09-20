import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import { getRedisSubscriber } from "@/lib/redis";
import {
  JOB_EVENTS_CHANNEL,
  type ClientToServerEvents,
  type InternalJobEvent,
  type ServerToClientEvents,
} from "@/lib/types";

export type AppSocketServer = Server<ClientToServerEvents, ServerToClientEvents>;

let io: AppSocketServer | null = null;

function isInternalJobEvent(value: unknown): value is InternalJobEvent {
  if (!value || typeof value !== "object") return false;
  const record = value as { type?: unknown; payload?: unknown };
  return (
    (record.type === "job:item-updated" || record.type === "job:updated") &&
    record.payload !== undefined
  );
}

export function initSocketServer(httpServer: HttpServer): AppSocketServer {
  if (io) {
    return io;
  }

  io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    path: "/api/socketio",
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL ?? "*",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    socket.on("job:subscribe", (jobId) => {
      if (typeof jobId === "string" && jobId.length > 0) {
        void socket.join(`job:${jobId}`);
      }
    });

    socket.on("job:unsubscribe", (jobId) => {
      if (typeof jobId === "string" && jobId.length > 0) {
        void socket.leave(`job:${jobId}`);
      }
    });
  });

  const subscriber = getRedisSubscriber();
  void subscriber.subscribe(JOB_EVENTS_CHANNEL);
  subscriber.on("message", (channel, message) => {
    if (channel !== JOB_EVENTS_CHANNEL || !io) return;

    try {
      const parsed: unknown = JSON.parse(message);
      if (!isInternalJobEvent(parsed)) return;

      if (parsed.type === "job:item-updated") {
        io.to(`job:${parsed.payload.jobId}`).emit(
          "job:item-updated",
          parsed.payload,
        );
      } else {
        io.to(`job:${parsed.payload.job.id}`).emit(
          "job:updated",
          parsed.payload,
        );
      }
    } catch (error) {
      console.error("[socket] failed to relay event", error);
    }
  });

  return io;
}

export function getSocketServer(): AppSocketServer | null {
  return io;
}
