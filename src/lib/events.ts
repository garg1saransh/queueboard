import { getRedis } from "@/lib/redis";
import {
  JOB_EVENTS_CHANNEL,
  type InternalJobEvent,
  type JobItemUpdatedPayload,
  type JobUpdatedPayload,
} from "@/lib/types";

export async function publishJobItemUpdated(
  payload: JobItemUpdatedPayload,
): Promise<void> {
  const event: InternalJobEvent = {
    type: "job:item-updated",
    payload,
  };
  await getRedis().publish(JOB_EVENTS_CHANNEL, JSON.stringify(event));
}

export async function publishJobUpdated(
  payload: JobUpdatedPayload,
): Promise<void> {
  const event: InternalJobEvent = {
    type: "job:updated",
    payload,
  };
  await getRedis().publish(JOB_EVENTS_CHANNEL, JSON.stringify(event));
}
