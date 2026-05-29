import { Response } from "express";
import { AccessUser } from "./access-control.service";

interface ActivityEventClient {
  readonly id: string;
  readonly user: AccessUser;
  readonly response: Response;
}

interface ActivityChangedPayload {
  readonly reason: string;
  readonly targetUserId?: string;
  readonly createdAt: string;
}

const clients = new Map<string, ActivityEventClient>();

const writeSseEvent = (response: Response, event: string, data: unknown) => {
  response.write(`event: ${event}\n`);
  response.write(`data: ${JSON.stringify(data)}\n\n`);
};

export const registerActivityEventClient = (user: AccessUser, response: Response) => {
  const clientId = `${user.id}:${Date.now()}:${Math.random().toString(36).slice(2)}`;

  response.setHeader("Content-Type", "text/event-stream");
  response.setHeader("Cache-Control", "no-cache, no-transform");
  response.setHeader("Connection", "keep-alive");
  response.setHeader("X-Accel-Buffering", "no");
  response.flushHeaders?.();

  const client: ActivityEventClient = { id: clientId, user, response };
  clients.set(clientId, client);

  writeSseEvent(response, "activity:connected", {
    userId: user.id,
    role: user.role,
    createdAt: new Date().toISOString(),
  });

  const heartbeatId = setInterval(() => {
    if (response.destroyed) {
      clients.delete(clientId);
      clearInterval(heartbeatId);
      return;
    }

    response.write(`: ping ${Date.now()}\n\n`);
  }, 25_000);

  response.on("close", () => {
    clients.delete(clientId);
    clearInterval(heartbeatId);
  });
};

export const emitActivityChanged = (payload: { reason: string; targetUserId?: string }) => {
  const eventPayload: ActivityChangedPayload = {
    ...payload,
    createdAt: new Date().toISOString(),
  };

  clients.forEach((client, clientId) => {
    if (client.response.destroyed) {
      clients.delete(clientId);
      return;
    }

    if (eventPayload.targetUserId && eventPayload.targetUserId !== client.user.id) return;
    if (client.user.role !== "patient" && client.user.role !== "nurse") return;

    writeSseEvent(client.response, "activity:changed", eventPayload);
  });
};
