import { test, expect } from "../fixtures/lab.js";
import { checkResponse, signIn } from "../support/api.js";

const boundaries = [
  ["Friday before opening", "2026-10-23T23:59:59.999Z", false],
  ["Saturday at opening", "2026-10-24T00:00:00.000Z", true],
  ["Sunday before closing", "2026-10-25T23:59:59.999Z", true],
  ["Monday at closing", "2026-10-26T00:00:00.000Z", false]
];

for (const [label, instant, available] of boundaries) {
  test("UTC offer window: " + label + " @weekend", async ({ request, clock }, testInfo) => {
    clock.setTime(instant);
    await signIn(request, testInfo);
    const listing = await checkResponse(await request.get("/api/offers"), 200, testInfo, "offer-availability");
    expect(listing.timezone).toBe("UTC");
    expect(listing.offers[0].available).toBe(available);
    await checkResponse(await request.post("/api/orders", {
      data: { product_id: 1, offer_id: 1 }
    }), available ? 201 : 409, testInfo, "offer-checkout");
    const history = await checkResponse(await request.get("/api/orders"), 200, testInfo, "order-history");
    expect(history.orders).toHaveLength(available ? 2 : 1);
  });
}
