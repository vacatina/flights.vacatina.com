# LiteAPI Sorting & Pagination Architecture

## The Core Problem: "Limit Before Sort"
When querying a large destination like New York via `placeId`, LiteAPI cannot fetch live, real-time pricing for all 1,000+ hotels at once without timing out (returning `2001: no availability found`). 

To prevent timeouts, LiteAPI forces a `limit`. However, the API architecture processes the query in this order:
1. **Selection:** Grab the top N hotels based on default relevance/distance (N = `limit`).
2. **Pricing:** Ping external suppliers for the live prices of those N hotels.
3. **Sorting:** Sort those specific N hotels by the requested field (e.g., `price`).

**The Result:** If we ask for `limit: 10` and `sort: price`, we DO NOT get the 10 cheapest hotels in New York. We get the 10 "most relevant" hotels, sorted by price. To find truly cheap hotels, we must cast a wider net (e.g., `limit: 300`).

---

## Solution 1: The "Fat Payload" Backend (Your Suggestion)

This approach moves the heavy lifting to our Next.js backend (acting as a Backend-For-Frontend or BFF).

### How it works:
1. **Initial Search:** The user searches New York. Our backend requests `limit: 300` from LiteAPI.
2. **Backend Sorting/Pagination:** Our backend receives all 300 hotels, sorts them globally (by price, rating, etc.), and sends only the first 10 to the frontend.
3. **Frontend UI:** The frontend knows there are 300 total results. It renders standard pagination (Pages 1-30).
4. **"Load More":** If the user hits page 31, our backend fires a new request to LiteAPI with `limit: 300, offset: 300` to grab the next massive chunk.

### Pros:
- **True Sorting:** We finally get true "Lowest Price" and "Highest Rating" sorting across a massive pool of hotels.
- **Fast Pagination:** Pages 1-30 are instant because our backend (or frontend) already has the data.
- **We get the Star Rating filter back!** Since we have the metadata for 300 hotels, we can easily filter them ourselves.

### Cons:
- **Slower Initial Load:** Requesting 300 live rates from LiteAPI takes slightly longer than requesting 10.
- **Data Stale-ness:** If a user sits on page 1 for an hour and then clicks page 2, the prices for those 300 hotels might have expired.

---

## Solution 2: Accept the API Constraints (The Expedia Approach)

We lean into the API's current behavior and adjust the UI to match. Many major OTAs actually do this to save on API costs.

### How it works:
1. We keep `limit: 10` (or increase slightly to `limit: 20`).
2. We rely on LiteAPI's standard pagination (`offset=0`, `offset=10`).
3. We rename the sort options to manage user expectations, e.g., "Price (Among Top Picks)".

### Pros:
- Lightning-fast initial load times.
- Zero complex state management on our backend.

### Cons:
- Users looking for the absolute cheapest budget motels won't find them easily unless they click through many pages.
- We cannot support custom filters (like Star Rating) reliably across paginated pages.

---

## Recommendation

Your proposed solution (**Solution 1**) is the most robust way to build a premium booking experience. By grabbing a large "chunk" of hotels (e.g., 200 or 300) in one go, we can offer instant filtering, flawless sorting, and a much better user experience. 

If we go this route, we will need to:
1. Create an API route in our Next.js backend (`/api/hotels/search`) to handle the heavy fetching.
2. Store the 300 results in a temporary cache (or just hold them in the React state on the frontend if we pass the whole payload down).
3. Build the pagination UI to slice through that cached array.
