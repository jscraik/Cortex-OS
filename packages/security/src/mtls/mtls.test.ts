import { EventEmitter } from "node:events";
import { describe, expect, it } from "vitest";
import { MTLSClient } from "./mtls";

const config = {
        caCertificate: "ca",
        clientCertificate: "cert",
        clientKey: "key",
};

describe("MTLSClient.receive", () => {
        it("concatenates multiple data chunks", async () => {
                const client = new MTLSClient(config);
                const socket = new EventEmitter() as any;
                (client as any).tlsSocket = socket;

                const promise = client.receive();
                socket.emit("data", Buffer.from("hello "));
                socket.emit("data", Buffer.from("world"));
                socket.emit("end");

                const data = await promise;
                expect(data.toString()).toBe("hello world");
        });
});
