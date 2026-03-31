Title: Following Search Best Practices<!-- -->

URL Source: https://duffel.com/docs/guides/following-search-best-practices

Markdown Content:
# Following Search Best Practices<!-- --> | Duffel Documentation

[](https://duffel.com/ "Navigate to duffel.com/docs")

[Guides](https://duffel.com/docs/guides/following-search-best-practices)[API](https://duffel.com/docs/guides/following-search-best-practices)[Search/](https://duffel.com/docs/guides/following-search-best-practices)

[](https://duffel.com/docs/guides/following-search-best-practices)[Create account](https://app.duffel.com/join)[Sign in](https://app.duffel.com/sign-in)

* * *

*   [Overview](https://duffel.com/docs)
*   Integrate with our API
    *   Flights
        *   [Getting Started with Flights](https://duffel.com/docs/guides/getting-started-with-flights)
        *   Search
            *   [Following Search Best Practices](https://duffel.com/docs/guides/following-search-best-practices)
            *   [Accessing Private Fares](https://duffel.com/docs/guides/accessing-private-fares)
            *   [Adding Loyalty Programme Accounts](https://duffel.com/docs/guides/adding-loyalty-programme-accounts)
            *   [Displaying Stops](https://duffel.com/docs/guides/displaying-stops)
            *   [Displaying Offer and Order Conditions](https://duffel.com/docs/guides/displaying-offer-and-order-conditions)
            *   [Finding Airports within an Area](https://duffel.com/docs/guides/finding-airports-within-an-area)
            *   [Adding Corporate Loyalty Programme Accounts](https://duffel.com/docs/guides/adding-corporate-loyalty-programme-accounts)

        *   Book
        *   Manage
        *   [Using Airline Credits](https://duffel.com/docs/guides/using-airline-credits)

    *   Stays
    *   Payments
    *   Notifications
    *   [Migrating API Version from v1 to v2](https://duffel.com/docs/guides/migrating-api-version-from-v1-to-v2)
    *   [Javascript client library](https://duffel.com/docs/guides/javascript-client-library)
    *   [Modelling Customers in Duffel](https://duffel.com/docs/guides/modelling-customers-in-duffel)

*   Integrate low-code solutions
*   Monetising travel
*   Travel operations
*   Using the dashboard

[Status](https://www.duffelstatus.com/)[Changelog](https://changelog.duffel.com/)[Help centre](https://help.duffel.com/)

# Following Search Best Practices

### Introduction

Flight offer payloads can sometimes contain thousands of offers, making it difficult to manage and display content.

The Duffel API supports building many kinds of search flows, but depending on your needs you might need to tweak your requests to ensure relevance of results and improve performance.

This guide outlines some options to help you deliver the best possible experience for your users.

### The Scenario

A return trip flight from JKF to MAD, can have 30 outbound departures and 20 inbound departures, resulting in 600 possible itineraries.

In addition, each itinerary offers 5 fare brands that can be combined with each other (e.g. selecting flexible economy on the outbound and premium economy on the inbound) resulting in 6,000 possible itineraries.

In some of the most popular flight routes we see the number of offers go up to the tens of thousands meaning a lot of content to manage and a heavy payload.

## Search Filters

Because airlines provide so very many options for flights it can be hard to find and quickly serve the right ones.

Duffel offers a series of Search Filters that can be used before sending a search request that notably reduce the number of offers.

The use of these filters prioritize relevant content to your users and optimize speed. We recommend using as many of these as possible in your integration, and in cases where it makes sense, setting them as default filters.

### Cabin Class Filter

If you want your users to specify what cabin they want to fly in, you can add the `cabin_class`filter to the request body.

This value is passed down to each airline, meaning you not only receive more relevant results, but also faster.

Shell

curl -X POST --compressed "https://api.duffel.com/air/offer_requests?return_offers=true"

 -H "Accept-Encoding: gzip"

 -H "Accept: application/json"

 -H "Content-Type: application/json"

 -H "Duffel-Version: v2"

 -H "Authorization: Bearer $YOUR_ACCESS_TOKEN"

 -d '{

 "data": {

 "slices": [

 {

 "origin": "MAD",

 "destination": "JFK",

 "departure_date": "2023-12-05"

 },

 {

 "origin": "JFK",

 "destination": "MAD",

 "departure_date": "2023-12-10"

 }

 ],

 "passengers": [

 {

 "type": "adult"

 }

 ],

 "cabin_class":"first"

 }

})

...

View full sample

Read more in the [Partial Offer Request](https://duffel.com/docs/api/v2/partial-offer-requests/create-partial-offer-request#partial-offer-requests-create-a-partial-offer-request-body-parameters-cabin-class) reference and the [Offer Request](https://duffel.com/docs/api/v2/offer-requests#offer-requests-schema-cabin-class) reference.

### Max Connections

Using the `max_connections` filter on the request body, ensures your users only receive offers that have up to the specified number of connections.

We recommend setting this filter to either 0 or 1 to get the right balance of relevant content and search speed. Although, one can also set the value to 2 connections if looking for even more offers.

Today, Duffel defaults to searching up to 1 connection when no filter is specified.

Shell

curl -X POST --compressed "https://api.duffel.com/air/offer_requests?return_offers=true"

 -H "Accept-Encoding: gzip"

 -H "Accept: application/json"

 -H "Content-Type: application/json"

 -H "Duffel-Version: v2"

 -H "Authorization: Bearer $YOUR_ACCESS_TOKEN"

 -d '{

 "data": {

 "slices": [

 {

 "origin": "MAD",

 "destination": "JFK",

 "departure_date": "2023-12-05"

 },

 {

 "origin": "JFK",

 "destination": "MAD",

 "departure_date": "2023-12-10"

 }

 ],

 "passengers": [

 {

 "type": "adult"

 }

 ],

 "max_connections": "0"

 }

})

...

View full sample

Read more in the [Partial Offer Request](https://duffel.com/docs/api/v2/partial-offer-requests#partial-offer-requests-create-a-partial-offer-request-body-parameters-max-connections) reference and the [Offer Request](https://duffel.com/docs/api/v2/offer-requests#offer-requests-create-an-offer-request-body-parameters-max-connections) reference.

### Departure and Arrival Time

This filter provides the fastest search experience if the user knows the flight they are looking for.

By providing the `departure_time` and/or `arrival_time` filters, we can limit the results to only those within the specified time frames.

This allows your users to e.g. search for all flights departing after 11am, or all flights arriving before 8pm. They can even specify if they want to depart and arrive between two specific times of the day.

Shell

curl -X POST --compressed "https://api.duffel.com/air/offer_requests?return_offers=true"

 -H "Accept-Encoding: gzip"

 -H "Accept: application/json"

 -H "Content-Type: application/json"

 -H "Duffel-Version: v2"

 -H "Authorization: Bearer $YOUR_ACCESS_TOKEN"

 -d '{

 "data": {

 "slices": [

 {

 "origin": "MAD",

 "destination": "JFK",

 "departure_time": {

 "to": "11:00",

 "from": "08:00"

 },

 "departure_date": "2023-12-05",

 "arrival_time": {

 "to": "17:00",

 "from": "09:45"

 }

 },

 {

 "origin": "JFK",

 "destination": "MAD",

 "departure_date": "2023-12-10"

 }

 ],

 "passengers": [

 {

 "type": "adult"

 }

 ],

 }

})

...

View full sample

Read more in the [Partial Offer Request](https://duffel.com/docs/guides/following-search-best-practices) reference and the [Offer Request](https://duffel.com/docs/guides/following-search-best-practices) reference.

## Query Parameters

### Controlling supplier timeout

Some searches take longer than others, and different users have different levels of tolerance for waiting.

The `supplier_timeout` allows you to specify on a per request basis, how long should a user wait for results.

A lower value is helpful if you are looking to favour speed over quantity of results, while a higher value favours more options.

By default, and as our recommendation, the Duffel API sets the limit at 20 seconds when the query parameter is unspecified.

Shell

curl -X POST --compressed "https://api.duffel.com/air/offer_requests?return_offers=true&supplier_timeout=10000"

 -H "Accept-Encoding: gzip"

 -H "Accept: application/json"

 -H "Content-Type: application/json"

 -H "Duffel-Version: v2"

 -H "Authorization: Bearer $YOUR_ACCESS_TOKEN"

 -d '{

 "data": {

 "slices": [

 {

 "origin": "MAD",

 "destination": "JFK",

 "departure_date": "2023-12-05"

 },

 {

 "origin": "JFK",

 "destination": "MAD",

 "departure_date": "2023-12-10"

 }

 ],

 "passengers": [

 {

 "type": "adult"

 }

 ],

 }

})

...

View full sample

Read more in the [Partial Offer Request](https://duffel.com/docs/api/v2/partial-offer-requests/create-partial-offer-request#partial-offer-requests-create-a-partial-offer-request-query-parameters-supplier-timeout) reference and the [Offer Request](https://duffel.com/docs/api/v2/offer-requests/create-offer-request#offer-requests-create-an-offer-request-query-parameters-supplier-timeout) reference.

## Keep Learning

The above guide focused on best practices to optimally gather information for your users.

If you want some recommendations on how to display the information to your users or learn more about how does NDC power the modern flight booking experience, follow these articles:

*   [Designing the Modern Flight Booking Experience](https://duffel.com/blog/designing-the-modern-flight-booking-experience)

*   [Why Your Customers Will Thank You For NDC](https://duffel.com/blog/why-your-customers-will-thank-you-for-ndc)

[* Search Filters](https://duffel.com/docs/guides/following-search-best-practices#search-filters)

[* Query Parameters](https://duffel.com/docs/guides/following-search-best-practices#query-parameters)

[* Keep Learning](https://duffel.com/docs/guides/following-search-best-practices#keep-learning)

Need some help?

We all do sometimes; code is hard.

 Visit our[Help Centre](https://help.duffel.com/)or[contact us](https://duffel.com/cdn-cgi/l/email-protection#1b737e776b5b7f6e7d7d7e7735787476)directly—we're here to help.

[Privacy Policy](https://duffel.com/privacy-policy)[Services Agreement](https://duffel.com/services-agreement)[Website Terms](https://duffel.com/terms)[Cookies Policy](https://duffel.com/cookies-policy)[Security and Compliance](https://duffel.com/security)
