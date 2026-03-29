Title: Getting Started with Flights<!-- -->

URL Source: https://duffel.com/docs/guides/getting-started-with-flights

Markdown Content:
* * *

This guide will walk you through how to go from nothing to your first booking.

Before you can get started with this guide, you'll need to:

*   [Sign up](https://app.duffel.com/join) for a Duffel account (it takes about 1 minute!)

*   On the navigation header, click on "More", then navigate to "Developers"

*   Create a test access token from the "Access tokens" page in your [Dashboard](https://app.duffel.com/)

To make it easy to build your Duffel integration, we offer a [JavaScript client library](https://duffel.com/docs/guides/javascript-client-library) in JavaScript, Custom element loaded with script tag, Custom element installed with npm and React Component.

If you aren't using JavaScript, you can follow along with `curl` in your terminal, or you can script the flow using your preferred programming language, or you can use the API in an HTTP client like [Postman](https://www.postman.com/).

Tip

We've put together a[Postman Collection](https://app.getpostman.com/run-collection/15595862-cce09558-a1c8-44f9-bde8-8a18715936c1?action=collection%2Ffork&collection-url=entityId%3D15595862-cce09558-a1c8-44f9-bde8-8a18715936c1%26entityType%3Dcollection%26workspaceId%3D03431b8a-0e9e-49c3-afe5-e2ba9ca63fbc)that contains all of the requests you'll need to follow along with this guide.

## Overview

Everything starts with passengers and a journey. In this guide, we'll follow an example scenario:

Tony, Pepper, and their daughter Morgan want to fly from New York City to Atlanta. They'll be leaving on 11th June and returning a week later on 18th June. Tony and his family prefer flying business class.

To complete this scenario, we'll be:

*   Searching for flights

*   Selecting an offer from the search results

*   Creating a booking using the selected offer

## Searching for flights

In our API, you create an offer request in order to search for flights.

To build the payload you'll need the flight itinerary - which should include the origin(s), destination(s) and departure date(s) - and information about the passengers. Here's how we search for Tony's flights:

duffel.offerRequests.create({

slices : [

{

origin: "NYC",

destination: "ATL",

departure_date: "2021-06-21"

},

{

origin: "ATL",

destination: "NYC",

departure_date: "2021-07-21"

}

],

passengers: [{ type: "adult" }, { type: "adult" }, { age: 1 }],

cabin_class: "business",

})

### What is a slice?

A slice represents a journey that the passengers want to make between a particular origin and a particular destination on a particular date. For the origin and destination, simply provide the IATA code for an airport (for example `ATL` for Atlanta's Hartsfield-Jackson International Airport) or for a city (for example `NYC` for New York City, which covers multiple airports).

In our example, we have two slices: the outbound from New York to Atlanta, and the inbound from Atlanta to New York.

### How do passengers work in the API?

When searching, you must provide the age of passengers aged under 18. For adults, you can just describe them using a `type`: `adult`.

This is important as airlines will charge different fares to passengers depending on their age.

When we create our booking later, we'll need to provide more information about the passengers like their names and dates of birth.

### What will I get back?

An `id` for the offer request. You may use this ID to [retrieve the offer request later](https://duffel.com/docs/api/v2/offer-requests/get-offer-request-by-id).

The response will include an array on `offers`.

We'll return an Offer Request object, echoing back your `slices` and `passengers`.

OfferRequests also include `passengers`. Each is given an `id`, which we'll need to refer to later, when making a booking.

### Learn more

The are 2 ways to arrive at offers, the method you use will depend on your use case:

*   _Return all offers in the offer request_ allows your application to pre-process the data. This is the example above. [You can find the API documentation here](https://duffel.com/docs/api/v2/offer-requests/create-offer-request)

*   _Streaming batches of offers_ is a good choice when you want to to start processing and or displaying the offers as soon as they're available. [You can find the API documentation here](https://duffel.com/docs/api/v2/batch-offer-requests/create-batch-offer-request)

## Selecting an offer from the search results

Offers get stale fairly quickly, and when they do, you are no longer able to book them.

Once Tony has picked an offer that works for him, you should retrieve the offer to get the most up to date version. You should do this when Tony picks an offer before you ask for his full passenger details and payment information.

To get the latest version of the offer, you can use the offer's `id` with the "Get a single offer" endpoint:

duffel.offers.get(OFFER_ID)

You'll need to replace `$OFFER_ID` with the ID of one of the offers returned.

The total cost for an offer will be up-to-date once you retrieve it using this endpoint. Its price will be under the `total_currency` and `total_amount` attributes.

### Slices and segments

The itinerary for a particular offer is described by its slices. Each offer will have the same slices as you specified when you created your Offer Request, but each slice will also contain one or more segments, describing in detail the flight(s) the passenger(s) will fly on.

For Tony's trip, let's say we are choosing an offer that departs from John F Kennedy Airport in New York (`JFK`) and has a stop in Washington Dulles Airport (`IAD`) on the way to `ATL`, and then no stops on the way back to `JFK`. On the outbound slice, you'll have 2 segments: one with `JFK` as its origin and `IAD` as its destination, and a second one from `IAD` to `ATL`. As the second slice is a direct flight with no stops, there's just a single segment from `ATL` back to `JFK`.

Inside those segments, you'll also find other important information like the airline and flight number, and the baggage included with that offer on each flight.

### Learn more

If you'd like to get a complete look at the offer schema and the operations to retrieve a single offer or a paginated list of them, check out our [API reference](https://duffel.com/docs/api/offers).

## Creating a booking using the selected offer

We are finally ready to make the booking for Tony and his family. In the Duffel API, this is called creating an order. You'll only need 3 things at this point:

*   The ID of the offer you'd like to book

*   Basic necessary information about the passengers

*   Payment method and information to confirm the order

You'll collect #2 and #3 in your checkout flow. During that flow and after you confirm the booking, there are some [important legal notices](https://help.duffel.com/hc/en-gb/articles/360021056640) that you must display to make sure that the customer understands how their data will be used and the rules that apply to their booking.

You should charge the customer yourself before creating the order.

To create an order, use the "Create an order" endpoint:

duffel.orders.create({

selected_offers: [OFFER_ID],

payments: [

{

type: "balance",

currency: TOTAL_CURRENCY,

amount: TOTAL_AMOUNT

}

],

passengers: [

{

phone_number: "+442080160508",

email: "tony@example.com",

born_on: "1980-07-24",

title: "mr",

gender: "m",

family_name: "Stark",

given_name: "Tony",

infant_passenger_id: INFANT_PASSENGER_ID,

id: ADULT_PASSENGER_ID_1

},

{

phone_number: "+442080160509",

email: "potts@example.com",

born_on: "1983-11-02",

title: "mrs",

gender: "m",

family_name: "Potts",

given_name: "Pepper",

id: ADULT_PASSENGER_ID_2

},

{

phone_number: "+442080160506",

email: "morgan@example.com",

born_on: "2019-08-24",

title: "mrs",

gender: "f",

family_name: "Stark",

given_name: "Morgan",

id: INFANT_PASSENGER_ID

}

]

})

### Selected offers

This attribute is an array that must contain a single offer ID: Replace `$OFFER_ID` with the one for the offer you'd like to book.

### Payments

This is an array of payment objects. Currently, we only support a single payment. There are two possible values for a payment's `type`:

*   `arc_bsp_cash` if you are a registered IATA travel agent and you are using your own airline relationships with Duffel.

*   `balance` if you are using Managed Content. Follow the ["Collecting Customer Card Payments" guide](https://duffel.com/docs/guides/collecting-customer-card-payments) if you want to collect the payment directly from your customer's card and use it here.

You'll also need to include the currency of the payment (`$TOTAL_CURRENCY`) in [ISO 4217](https://en.wikipedia.org/wiki/ISO_4217) format — it should match the offer's `total_currency` — and the total amount (`$TOTAL_AMOUNT`) of the order, which should match the offer's `total_amount`.

### Passengers

When creating an order you also need to provide information about all of the passengers.

To do this, we'll refer to each passenger using their `id` from our Offer Request. To do this, simply replace the `$ADULT_PASSENGER_ID_1`, `$ADULT_PASSENGER_ID_2` and `$INFANT_PASSENGER_ID` from the example above.

Additionally, you'll need to provide each passenger's name, date of birth, gender, email and phone number.

Note

You must ensure that it is the passenger's email address that is provided. Additionally, it is required that it is the passenger themselves who completes check in.

If there are any infant passengers (that is, passengers aged 0 or 1 on the date of the last flight), you must specify which of the adult passengers will be responsible for them. To do that, you'll need to assign the infant's passenger `id` to the responsible adult's `infant_passenger_id`. All infants must have unique responsible adults.

### Learn more

If you'd like to get a complete look at data you can provide when creating an order and what you'll get back, check out our [API reference](https://duffel.com/docs/api/orders/create-order).

## Keep Learning

All set! Tony and his family have been booked on their flights. The order returned by the API includes the airline's `booking_reference`, which you'd use to find the booking on the airline's website. The order can be retrieved any time by its `id`.

Where to go from here?
