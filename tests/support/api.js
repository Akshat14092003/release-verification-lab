import { expect } from "@playwright/test";
import { accounts, PASSWORD } from "./accounts.js";

export async function checkResponse(response, status, testInfo, label = "api-response") {
  const text = await response.text();
  const contentType = response.headers()["content-type"] || "";
  const body = contentType.includes("application/json") ? JSON.parse(text) : text;
  const evidence = { url: response.url(), expectedStatus: status, status: response.status(), body };
  await testInfo.attach(label, {
    contentType: "application/json",
    body: Buffer.from(JSON.stringify(evidence, null, 2))
  });
  expect(response.status(), "HTTP evidence: " + JSON.stringify(evidence)).toBe(status);
  return body;
}

export async function signIn(request, testInfo, role = "customer") {
  const account = accounts[role];
  const response = await request.post("/api/auth/login", {
    data: { email: account.email, password: PASSWORD }
  });
  const body = await checkResponse(response, 200, testInfo, "login-response");
  expect(body.user).toMatchObject(account);
  return body.user;
}
