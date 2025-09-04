import http from "node:http";
import https from "node:https";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { generateEmbedding } from "./embedding.ts";

const key = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDsYeO1VN0jL0UP
Oq3XEdi8CDnRu+BdErwmWCu1PoOp8ZsoyuCcFhj57LUKGcNaSC2FS2dBULRubq5E
EH5i44fJsCjgdlsDWN6u9sTJBsLpowewHRekFnPuDmO9EtWD0eqShsJU/qjJ59HO
Zredy/dWEM8vdOHlZLtSO64ZZllvN+kFeAwRxvipaHS22TZHdQX1ySwMSdKMSXXA
FwtrRiWvHw0Yei9iP+ct0MbIthnJvqjC0s5VlJyWHIZdmLYOhgTImamgjuUwyDo2
/AoVAQZx+Bb5gGhBaqFxtqwqxKVFZ8VsHTmI0f76BbAz/xHtbhG26qUuMHL2BUAO
I0VyGE8NAgMBAAECggEANrmY8p+hjKZCajqvCWYf07Rh0m0ZDeMq/QOXpt/AsqT1
Q3XolypEgQPsi9iYEfw40a25y3TIOPLV1HsvD2zWwHpQlFrCSl2WPFJ0D4hJsrZk
LsElen8aOshJDfpgxSJhmKerMOs+H3RUbeD47IbOjbXZiYaZT7bI6UpYzZeU5/rL
PFxugNzVtBavLyDVVqCuEtoqhSuCYis3Zep4UKajxFFP/s/7J5CaYy2g9Yudy56B
VVhSufK5Zol1eF0WrbnwpMJUmLlnZm+cT3Kz54UBXJOQzfcAjk9divREn71jIjAM
k8z8OwhWRWGBk5859puktCgAcOUGxjzSbyfqFYn0vwKBgQD9GXgNlVQJXBmEmjZM
Med5K/vf+Lz0F6b054OCBZE8JQ12ZjLn6RhBvJxUlN7cQ4VqutHMaJcdpelauy3J
CyUZjuE65IPWF3OsnqfEOgx5z0stk6wISyvBH18SquczqfpBEBwz47W3ttnZ/KM3
NsKyJHiFNTPavM7+0Ozjif6OXwKBgQDvF2BukOjmDpyOTevJsHxNf54MKmUzVJM5
WJMG0WWjOS4SpAEsiQtm+8ETwUhkENxmxdOraCCk44w7heS8sW9Fbn+bo9+GhrCo
Gdfhw1oblDmqSypodd8cFEEMStNhosxNkWvzqrgvTtnR08NTBtIxJn/qqCaFL8ud
7eWRIkkCEwKBgEzEettz3adxHfRQagO2Z0UjiCQo5/cJbYR+7C51zdV2T50H5ozc
8JSPxsMI3IfmmwMCYzwixSMi/aKdf4epL7mO0tXwFeTL/DPxc2VbTglsTJsoXVeu
pTjQcR/SYooTFmrBnixG9wkgFve9XywSGf+6fCu7NV01Q3ualx907Zb1AoGBAIVY
TVD9AtekGI6JSNLg2kLCxRvV3UFGjyGxk7Z+vKfO8TI2Q+1ZtYFHMYTaDIy6lqG+
/XGgjmxH+GMOJudSMlPP792XBMhbgFUQrMVeFXhCL/MZHtrJuphHd4vqg3/1suok
C8gHU9gWqwcKiupYaIw/A6KVC37GjFJVZu6N55f/AoGAct2BFQRNmW6/LQseTjpd
qEeGmlmY+d+hMFbdzBCX2HCnWkjteLeSh99KUsXWxg4tNmWf8Ovu/701Y0X5AmVM
ZLiHzPC+CCDW0rJAfgx0vIR9k0K9gseij9n+ti+gUtUyk9Z3bKGYBPvxl81AiE4q
HvIlB8OFtTsbvOXW2AIiLmc=
-----END PRIVATE KEY-----`;

const cert = `-----BEGIN CERTIFICATE-----
MIIDCTCCAfGgAwIBAgIUY+pQpZbNtCNkRNC4gyvPifR04AswDQYJKoZIhvcNAQEL
BQAwFDESMBAGA1UEAwwJbG9jYWxob3N0MB4XDTI1MDkwNDIwMjUyOVoXDTI1MDkw
NTIwMjUyOVowFDESMBAGA1UEAwwJbG9jYWxob3N0MIIBIjANBgkqhkiG9w0BAQEF
AAOCAQ8AMIIBCgKCAQEA7GHjtVTdIy9FDzqt1xHYvAg50bvgXRK8JlgrtT6DqfGb
KMrgnBYY+ey1ChnDWkgthUtnQVC0bm6uRBB+YuOHybAo4HZbA1jervbEyQbC6aMH
sB0XpBZz7g5jvRLVg9HqkobCVP6oyefRzma3ncv3VhDPL3Th5WS7UjuuGWZZbzfp
BXgMEcb4qWh0ttk2R3UF9cksDEnSjEl1wBcLa0Ylrx8NGHovYj/nLdDGyLYZyb6o
wtLOVZSclhyGXZi2DoYEyJmpoI7lMMg6NvwKFQEGcfgW+YBoQWqhcbasKsSlRWfF
bB05iNH++gWwM/8R7W4RtuqlLjBy9gVADiNFchhPDQIDAQABo1MwUTAdBgNVHQ4E
FgQUhvSSzU5ofEpjOM96AvSHIjZcPScwHwYDVR0jBBgwFoAUhvSSzU5ofEpjOM96
AvSHIjZcPScwDwYDVR0TAQH/BAUwAwEB/zANBgkqhkiG9w0BAQsFAAOCAQEArss6
hWrHEWr4MXgrahE9n2nGKdGATn1pKCYwuMdy9tbVxfWsneGJ1Mj3hbcCVaabUvwp
Zv7ir7P8nt8wRqokr7r1NRdOuC5hlSHTlz0PbKwWZ8ffowzy7uZ0smzZ9iCvke22
9xEexFas5FDSRCYJ66uASAGn2kx4yelVZHrcnWxrdyqZ0VldKfMxNJMcZ4wFrPpi
z05aTR11ycmf2o4VjDsEF5MZk1TRBkTMzKa9hszbM5TBowD/kC0Yg81Fq+hpawfD
a17M+p/4sRMQahVP7znFz9O1XNb9R1UQPxG5SzPqT8EC/y3QXd2T6sU3QswXM5DP
mKWR+K5C5UbDDdgOrg==
-----END CERTIFICATE-----`;

let mlxServer: http.Server;
let frontierServer: https.Server;
let originalTls: string | undefined;

beforeAll(async () => {
        originalTls = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
        mlxServer = http.createServer((req, res) => {
                if (req.method === "POST" && req.url === "/embed") {
                        res.setHeader("Content-Type", "application/json");
                        res.end(JSON.stringify({ embeddings: [[1, 2, 3]] }));
                }
        });
        frontierServer = https.createServer({ key, cert }, (req, res) => {
                if (req.method === "POST" && req.url === "/embed") {
                        res.setHeader("Content-Type", "application/json");
                        res.end(JSON.stringify({ embeddings: [[9, 9, 9]] }));
                }
        });
        await Promise.all([
                new Promise((r) => mlxServer.listen(0, r)),
                new Promise((r) => frontierServer.listen(0, r)),
        ]);
        const mlxPort = (mlxServer.address() as AddressInfo).port;
        const frontierPort = (frontierServer.address() as AddressInfo).port;
        process.env.MLX_SERVICE_URL = `http://127.0.0.1:${mlxPort}`;
        process.env.FRONTIER_API_URL = `https://127.0.0.1:${frontierPort}`;
});

afterAll(() => {
        mlxServer.close();
        frontierServer.close();
        if (originalTls === undefined) {
                delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
        } else {
                process.env.NODE_TLS_REJECT_UNAUTHORIZED = originalTls;
        }
        delete process.env.MLX_SERVICE_URL;
        delete process.env.FRONTIER_API_URL;
});

describe("generateEmbedding", () => {
        it("returns embedding from MLX service", async () => {
                const emb = await generateEmbedding("hello");
                expect(Array.from(emb)).toEqual([1, 2, 3]);
        });

        it("falls back to Frontier API on failure", async () => {
                mlxServer.removeAllListeners("request");
                mlxServer.on("request", (req, res) => {
                        if (req.method === "POST" && req.url === "/embed") {
                                res.statusCode = 500;
                                res.end();
                        }
                });

                const emb = await generateEmbedding("hello");
                expect(Array.from(emb)).toEqual([9, 9, 9]);
        });

        it("throws on invalid input", async () => {
                await expect(generateEmbedding("")).rejects.toThrow();
        });
});
