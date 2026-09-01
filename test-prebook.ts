import { getLiteApiClient } from "./lib/liteapi/client";

async function main() {
  const client = getLiteApiClient();
  
  try {
    console.log("Searching for fresh rates...");
    const searchRes = await client.post<any>("/hotels/rates", {
      occupancies: [{ adults: 2 }],
      currency: "USD",
      guestNationality: "US",
      checkin: "2026-10-10",
      checkout: "2026-10-12",
      limit: 1,
      hotelIds: ["lp6556e886"],
      maxRatesPerHotel: 1
    });
    
    const offerId = searchRes.data[0].roomTypes[0].offerId;
    console.log("Got offerId, prebooking...", offerId);
    
    const res = await client.post<any>("/rates/prebook", { offerId, usePaymentSdk: false });
    console.log("Prebook Success:");
    console.log(JSON.stringify(res, null, 2));
  } catch (e: any) {
    console.error("Failed:", e.message);
  }
}
main();
