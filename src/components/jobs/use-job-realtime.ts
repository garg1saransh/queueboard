"use client";

import { useCallback, useEffect, useState } from "react";
import { io, type Socket } from "socket.io-client";
import type {
  ClientToServerEvents,
  JobDetail,
  JobItemView,
  JobSummary,
  ServerToClientEvents,
} from "@/lib/types";

type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

function sortItems(items: JobItemView[]): JobItemView[] {
  return items.slice().sort((a, b) => a.itemNumber - b.itemNumber);
}

function toSummary(job: JobDetail): JobSummary {
  return {
    id: job.id,
    status: job.status,
    totalCount: job.totalCount,
    completedCount: job.completedCount,
    failedCount: job.failedCount,
    pendingCount: job.pendingCount,
    processingCount: job.processingCount,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  };
}

export function useJobRealtime(initialJob: JobDetail) {
  const [job, setJob] = useState<JobSummary>(() => toSummary(initialJob));
  const [items, setItems] = useState<JobItemView[]>(() =>
    sortItems(initialJob.items),
  );
  const [connectionState, setConnectionState] = useState<
    "connecting" | "connected" | "disconnected"
  >("connecting");

  const applyJobUpdate = useCallback((next: JobSummary) => {
    setJob(next);
  }, []);

  const applyItemUpdate = useCallback((item: JobItemView) => {
    setItems((current) => {
      const index = current.findIndex((row) => row.id === item.id);
      if (index === -1) {
        return sortItems([...current, item]);
      }
      const next = current.slice();
      next[index] = item;
      return next;
    });
  }, []);

  useEffect(() => {
    const socketUrl =
      process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin;

    const socket: AppSocket = io(socketUrl, {
      path: "/api/socketio",
      transports: ["websocket", "polling"],
    });

    socket.on("connect", () => {
      setConnectionState("connected");
      socket.emit("job:subscribe", initialJob.id);
    });

    socket.on("disconnect", () => {
      setConnectionState("disconnected");
    });

    socket.on("connect_error", () => {
      setConnectionState("disconnected");
    });

    socket.on("job:item-updated", (payload) => {
      if (payload.jobId !== initialJob.id) return;
      applyItemUpdate(payload.item);
    });

    socket.on("job:updated", (payload) => {
      if (payload.job.id !== initialJob.id) return;
      applyJobUpdate(payload.job);
    });

    return () => {
      socket.emit("job:unsubscribe", initialJob.id);
      socket.disconnect();
    };
  }, [applyItemUpdate, applyJobUpdate, initialJob.id]);

  return {
    job,
    items,
    connectionState,
    setJob,
    setItems,
  };
}
