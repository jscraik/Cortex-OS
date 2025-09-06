import { setAuditPublisher } from "./audit.js";
import type { CloudEvent } from "../integrations/cloudevents.js";

export type MCPPublisher = (evt: CloudEvent) => Promise<void> | void;

export function configureAuditPublisherWithMCP(publish: MCPPublisher) {
  setAuditPublisher(async (evt: CloudEvent) => {
    await publish(evt);
  });
}
