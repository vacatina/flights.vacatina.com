Instructions:  

Create a booking website using Nuitee Connect.  

The user should be able to first choose whether to search by destination (using the places search), or search for a hotel by a free text search ("search by vibe", using the ai search), select a date range, and select the number of guests.  

The user should be able to select a hotel and see the available offers, grouped by room (also display the room name and first image).  

The user should be able to select an offer and book the hotel.  

The checkout form should ask the user for the guest details (first name, last name, email), then display the payment form.  

The user should be able to see the booking confirmation and the hotel details.

The Nuitee Connect key is to use is sand_c0155ab8-c683-4f26-8f94-b5e92c5797b9

Follow the instructions to create the booking website. Use the Nuitee Connect API key provided above.

---

# Nuitee Connect — Minimal Wiring Guide

**Flow:** **Search Places (optional) → Search Rates → Prebook → Payment SDK → Book**  
**Headers (all requests):** `X-API-Key: <LITEAPI_KEY>` · `accept: application/json` · (`content-type: application/json` for POST)  
**Nuitee Connect API Key** production keys have a prefix of `prod_`, sandbox keys have a prefix of `sandbox_`.

All endpoints must be called server-side not to expose the API key to the client. The endpoints have CORS restrictions, so they can't be called from the client.

---

## 1) Search Places

**GET** `https://api.liteapi.travel/v3.0/data/places?textQuery={q}`  
**Use:** autocomplete; keep `placeId` & `displayName`.

**Resp (essential)**

```json
{ "data": [
  { "placeId":"ChIJdd4hrwug2EcRmSrV3Vo6llI", "displayName":"London", "formattedAddress":"UK" }
]}

```

---

## 2) Search Hotel Rates

**POST** `https://api.liteapi.travel/v3.0/hotels/rates`

**A. By place**

```json
{
  "occupancies":[{"adults":2}],
  "currency":"USD",
  "guestNationality":"US",
  "checkin":"YYYY-MM-DD",
  "checkout":"YYYY-MM-DD",
  "placeId":"<from places>",
  "roomMapping": true,
  "maxRatesPerHotel": 1,
  "includeHotelData": true
}

```

**B. Single hotel**

```json
{
  "hotelIds":["<hotelId>"],
  "occupancies":[{"adults":2}],
  "currency":"USD",
  "guestNationality":"US",
  "checkin":"YYYY-MM-DD",
  "checkout":"YYYY-MM-DD",
  "roomMapping":true,
  "maxRatesPerHotel":1,
  "includeHotelData": true
}

```

**Resp (essential shape)**

```json
{
  "data": [{
    "hotelId":"<id>",
    "roomTypes":[{
      "offerId":"<offerId>",
      "rates":[{
        "name":"<room>",
        "mappedRoomId": 123,
        "boardName":"Room Only",
        "retailRate":{"total":[{"amount":131.54,"currency":"USD"}],
          "taxesAndFees":[{"included":true}]},
        "cancellationPolicies":{"refundableTag":"RFN","cancelPolicyInfos":[{"cancelTime":"YYYY-MM-DD HH:mm:ss"}]}
      }]
    }]
  }],
  "guestLevel": 0,
  "sandbox": true
}

```

**Display:** price = `retailRate.total[0]`; taxes badge from `taxesAndFees[].included`; RFN/NRF from `refundableTag`.

- The `offerId` is the id of the offer and should be used to prebook the offer.
- The `name` is the name of the room and should be used to display the room rate name.
- The `mappedRoomId` is the id of the room and should be used to group rates by room.
- The `boardName` is the name of the board and should be used to display the board name.

---

## 2b) **AI Search → Rates + Brief Hotel Info**

**POST** `https://api.liteapi.travel/v3.0/hotels/rates`

**Body (use **`aiSearch`** instead of **`placeId`**/**`hotelIds`** and **`includeHotelData`** as **`true`**)**

```json
{
  "occupancies":[{"adults":2}],
  "currency":"USD",
  "guestNationality":"US",
  "checkin":"YYYY-MM-DD",
  "checkout":"YYYY-MM-DD",
  "maxRatesPerHotel":1,
  "roomMapping": true,
  "aiSearch":"romantic getaway in paris",
  "includeHotelData": true
}

```

**Resp (adds a **`hotels`** array)**

```json
{
  "data":[{ "hotelId":"<id>", "roomTypes":[{ "offerId":"<offerId>", "rates":[{ "name":"<room>", "mappedRoomId": 123, "boardName":"Room Only", "retailRate":{"total":[{"amount":412.76,"currency":"USD"}]}, "cancellationPolicies":{"refundableTag":"NRFN"} }]}]}],
  "hotels":[
    {
      "id": "lp19fec",
      "name": "Hotel Sainte-Beuve",
      "main_photo": "https://…",
      "address": "9 Rue Sainte-Beuve",
      "rating": 8.75,
      "tags": [
        "historic building",
        "wrought iron balconies"
      ],
      "persona": "Cultured Explorer",
      "style": "Classic Parisian Elegance",
      "location_type": "Urban Boutique Hotel",
      "story": "A charming Parisian hotel on a quiet street"
    },
  ],
  "sandbox": true
}

```

**Use:** render list immediately from `hotels` (name, photo, address, rating) and attach prices using the matching entries in `data` by `hotelId`.

---

## 3) Prebook

**POST** `https://book.liteapi.travel/v3.0/rates/prebook`

- The `offerId` is the id of the rate and SHOULD always be used to prebook the rate.
- Can take 5-10 seconds to complete, so consider showing a loading UX.
- When not successful, consider redirecting the user to the single hotel page with an error message to choose a different rate.

**Body**

- All parameters are required.

```json
{
  "usePaymentSdk": true, // required
  "offerId": "<offerId from selected roomTypes response>" // required
}

```

**Resp (essential)**

Status Code: 200

```json
{
  "data": {
    "prebookId": "<id>",
    "offerId": "<id>",
    "hotelId": "<id>",
    "price": 690.21,
    "commission": 103.74,
    "currency": "USD",
    "transactionId": "<id>",
    "secretKey": "<key>",
    "paymentTypes": ["NUITEE_PAY"],
    "roomTypes": [{
      "rates": [{
        "rateId": "<id>",
        "retailRate": {
          "total": [{"amount": 690.21, "currency": "USD"}],
          "taxesAndFees": [{"included": true, "amount": 43.61}]
        },
        "cancellationPolicies": {
          "refundableTag": "RFN",
          "cancelPolicyInfos": [{"cancelTime": "YYYY-MM-DD HH:mm:ss"}]
        }
      }]
    }]
  }
}

```

**Use:** store `prebookId` for booking; `transactionId` + `secretKey` for payment; confirm pricing/cancellation from `roomTypes[].rates[]`.

**Error**

```json
{
  "error": {
    "code": 4002,
    "description": "invalid offerId",
    "message": "required request field is missing or wrong input"
  }
}

```

---

## 4) Payment SDK

When implementing this, on the UI consider a form to collect the guest details necessary for the booking before displaying the payment form (point 5).

For sandbox bookings, in the UI add a note saying to use the test card 4242424242424242 any three digits for cvv and any future expiration date.

**Script:** `<script src="https://payment-wrapper.liteapi.travel/dist/liteAPIPayment.js?v=a1"></script>`

**Config**

```javascript
var liteAPIConfig = {
  publicKey: 'live', // or 'sandbox' (must match API key environment)
  secretKey: '<from prebook response>',
  returnUrl: '<your-booking-page-url>?prebookId=123&transactionId=456',
  targetElement: '#targetElement',
  appearance: { theme: 'flat' },
  options: { business: { name: 'Your Business' } }
};
var liteAPIPayment = new LiteAPIPayment(liteAPIConfig);
document.addEventListener('DOMContentLoaded', function() {
  liteAPIPayment.handlePayment();
});

```

**Use:** `publicKey` must match API key env (`live`/`sandbox`); `secretKey` from prebook; `returnUrl` where booking endpoint will be called; store `transactionId` + `prebookId` (cannot retrieve later). After payment success, user redirects to `returnUrl`.

The payment SDK uses Stripe Elements for payment processing, so make sure to style it correctly (e.g. the Pay button class `lp-submit-button` should be styled to match the rest of the UI).

Once the payment call is successful, the user will be redirected to the returnURL. There, you can gather the remaining information and book the room using the book endpoint. You will use the `transactionId` and the `prebookId` from the prebook step.

Note: Each call to prebook generates a new `transactionId` and `prebookId`, so it is important that you save the `transactionId` sent to the payment SDK and its corresponding `prebookId` as you will not be able to get them back.

---

## 5) Book

**POST** `https://book.liteapi.travel/v3.0/rates/book`

When successful, returns a 200 status code. Can take 5-10 seconds to complete, so consider showing a loading UX.

**Body**

```json
{
  "prebookId": "<from prebook>",
  "holder": {
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com"
  },
  "payment": {
    "method": "TRANSACTION_ID",
    "transactionId": "<from prebook>"
  },
  "guests": [{
    "occupancyNumber": 1,
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com"
  }]
}

```

**Resp (essential)**

```json
{
  "data": {
    "bookingId": "<id>",
    "status": "CONFIRMED",
    "hotelConfirmationCode": "<code>",
    "checkin": "YYYY-MM-DD",
    "checkout": "YYYY-MM-DD",
    "hotel": {
      "hotelId": "<id>",
      "name": "<name>"
    },
    "price": 100,
    "currency": "USD",
    "cancellationPolicies": {
      "refundableTag": "RFN",
      "cancelPolicyInfos": [{"cancelTime": "YYYY-MM-DD HH:mm:ss"}]
    }
  }
}

```

**Use:** collect guest details before payment success; send `prebookId` + `transactionId` with `payment.method: "TRANSACTION_ID"`; display `bookingId` and `hotelConfirmationCode` on confirmation.

**Sample error response**

```json
{
  "error": {
    "code": 4002,
    "description": "missing or empty transaction id",
    "message": "required request field is missing or wrong input"
  }
}

```

---

## 6) Hotel Details

**GET** `https://api.liteapi.travel/v3.0/data/hotel?hotelId={hotelId}&timeout=4`  
**Resp (essential)**

```json
{ "data":{
  "id":"<id>",
  "name":"<name>",
  "hotelDescription":"<p>…</p>",
  "hotelImages":[{"url":"https://...","defaultImage":true}],
  "hotelImportantInformation": "<p>...</p>",
  "main_photo": "https://path/to/img.png",
  "videoUrl": "https://path/to/optional/video.mp4",
  "city":"<city>",
  "country":"UK",
  "address":"<addr>",
  "hotelFacilities": ["Full-service spa"],
  "starRating":4,
  "location":{"latitude":0,"longitude":0},
  "rooms":[{"id":123,"roomName":"<room>","photos":[{"url":"https://..."}]}],
  "policies":[{"name":"Pets","description":"…"}],
  "sentiment_analysis":{"pros":["…"],"cons":["…"]}
}}

```

---

## Wiring Summary

- **Places Autocomplete:** GET `/data/places` → store `{placeId, displayName}`.
- **Rates (standard):** POST `/hotels/rates` with `placeId` (or `hotelIds`).
- **Rates (AI search for free text):** POST `/hotels/rates` with `aiSearch:"<free text>"` + dates/occupancies → use `hotels[]` for card info, `data[]` for prices.
- **Prebook:** POST `/rates/prebook` with `offerId` → store `prebookId`, `transactionId`, `secretKey` for booking/payment.
- **Payment:** Load Payment SDK with `secretKey` from prebook; set `publicKey` to match API env; `returnUrl` to booking page.
- **Book:** POST `/rates/book` with `prebookId`, `transactionId` (as `payment.transactionId`), and guest details → display `bookingId` + `hotelConfirmationCode`.
- **Hotel page:** GET `/data/hotel?hotelId=…` (fetch the details about a hotel; also, re-query rates for that `hotelId` without the `maxRatesPerHotel` parameter to get all rates; each rate has a `mappedRoomId` that should be used to visually group rates by room).
