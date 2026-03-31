Title: Accessing Private Fares<!-- --> | Duffel Documentation

URL Source: https://duffel.com/docs/guides/accessing-private-fares

Markdown Content:
## Overview

Private fares are specially discounted fares contracted between airlines and agents. They can also come in form of special conditions like different flight change conditions.

If you have fares filed with airlines, you can use Duffel API to request private fares.

## How to request private fares?

There are two types of private fares which can be requested during offer request creation.

*   **_Corporate private fares_**: These are requested by passing a `corporate_code` and/or `tracking_reference`. These are given by the airlines and are used to identify an agency.

*   **_Leisure private fares_**: These are requested by passing a `fare_type` per passenger. You can also request these along with passing corporate private fares.

## Corporate private fares

### Request

The request parameters are the same as for creating an [offer request](https://duffel.com/docs/api/offer-requests/create-offer-request), except there is an additional field passed called `private_fares`. The key for each object is the airline's IATA code and the value is a list of objects with codes. Currently one can only pass one per airline but this may change in future.

A `corporate_code` is usually your account and `tracking_reference` is used to identify your business with some airlines. Qantas for example, requires an Australian business number (ABN) as a tracking reference in addition or instead of corporate code. Depending on your setup with the airlines, you can pass one or both `corporate_code` and `tracking_reference`.

curl -X POST --compressed "https://api.duffel.com/air/offer_requests"

-H "Accept-Encoding: gzip"

-H "Accept: application/json"

-H "Content-Type: application/json"

-H "Duffel-Version: v2"

-H "Authorization: Bearer $YOUR_ACCESS_TOKEN"

-d '{

"data": {

"private_fares": {

"QF": [

{

"tracking_reference": "ABN:2345678",

"corporate_code": "FLX53"

}

],

"BA": [

{

"corporate_code": "5623"

}

]

},

"slices": [

{

"origin": "LHR",

"destination": "JFK",

"departure_date": "2023-11-24"

},

{

"origin": "JFK",

"destination": "LHR",

"departure_date": "2023-12-02"

}

],

"passengers": [

{

"type": "adult"

}

]

}

}'

### Response

The response is the same as after [creating an offer request](https://duffel.com/docs/api/offer-requests/create-offer-request), except that the offers which have private fares applied are labelled with a `private_fares` object. If `private_fares` list is empty, then private fares are not applied on that offer.

{

"id": "orq_00009hthhsUZ8W4LxQghdf",

"offers": [

{

"id": "off_00009htYpSCXrwaB9DnUm0",

"slices": [...]

"private_fares": [

{

"tracking_reference": "ABN:2345678",

"corporate_code": "FLX53",

"type": "corporate"

}

]

},

{

"id": "off_00009htYpSCXrwaB96254",

"slices": [...]

"private_fares": [

{

"corporate_code": "5623",

"type": "corporate"

}

]

}

]

}

## Leisure private fares

### Request

The request parameters are the same as for creating an [offer request](https://duffel.com/docs/api/offer-requests/create-offer-request), except for each passenger for which private fares are expected, the `fare_type` field is passed. For some fare types involving children or infants you can pass in age as well.

curl -X POST --compressed "https://api.duffel.com/air/offer_requests"

-H "Accept-Encoding: gzip"

-H "Accept: application/json"

-H "Content-Type: application/json"

-H "Duffel-Version: v2"

-H "Authorization: Bearer $YOUR_ACCESS_TOKEN"

-d '{

"data": {

"passengers": [

{

"fare_type": "student"

},

{

"fare_type": "contract_bulk_child",

"age": 5

}

],

"slices": [

{

"origin": "LHR",

"destination": "JFK",

"departure_date": "2023-12-24"

},

{

"origin": "JFK",

"destination": "LHR",

"departure_date": "2023-12-02"

}

]

}

}'

### Response

The response is the same as after [creating an offer request](https://duffel.com/docs/api/offer-requests/create-offer-request), except that the offers which have private fares applied are labelled with a `private_fares` object. If `private_fares` list is empty, then private fares are not applied on that offer.

{

"id": "orq_00009hthhsUZ8W4LxQghdf",

"offers": [

{

"id": "off_00009htYpSCXrwaB9DnUm0_0",

"slices": [...]

"private_fares": [

{

"type": "leisure"

}

]

}

]

}

## Airlines support and other considerations

Duffel exposes a set of [fare types](https://duffel.com/docs/api/offer-requests/create-offer-request#offer-requests-create-an-offer-request-body-parameters-passengers-passengers-passengers-fare-type) for leisure private fares. Different airlines support a different subset of these. You should know the fare types supported as you would have filed them with the airlines. If you want to add a fare type that you already have filed with the airline but not exposed by us then contact us. Passing an unsupported fare type for an airline will result in getting no private fare or any offers for that airline.

Similarly if you pass in a corporate code for an unsupported airline or pass one that is not filed with the airline, you would not see private fare offers from that airline.

## Keep Learning

This is how you request private fares during offer request creation. The following steps to create an order are same as other flows.
