Title: Cancelling an Order<!-- --> | Duffel Documentation

URL Source: https://duffel.com/docs/guides/cancelling-an-order

Markdown Content:
Note

Cancellation is not yet supported for every order. If an order has the string `cancel` in its `available_actions` then you should be able to cancel it via the API. Otherwise, it is recommended to manually request a cancellation quote by clicking on the "Cancellation quote" option under "Manage this order" when viewing the order in the dashboard. The cancellation will then be handled by a member of our team.

## What do you need to start?

All you need to get started is the `id` of the order you'd like to cancel. You must also ensure that the order is cancellable by checking whether `"cancel"` is a member of the `available_actions` property of the order.

Tip

We've put together a[Postman Collection](https://app.getpostman.com/run-collection/15754339-e485f306-ebae-47db-82a3-a3470d4ceb90?action=collection%2Ffork&collection-url=entityId%3D15754339-e485f306-ebae-47db-82a3-a3470d4ceb90%26entityType%3Dcollection%26workspaceId%3D03431b8a-0e9e-49c3-afe5-e2ba9ca63fbc)that contains all of the requests you'll need to follow along with this guide.

## Overview

The order cancellation process happens in 2 steps:

*   You create an unconfirmed cancellation quote

*   You confirm the cancellation

## Create Cancellation Quote

You have the ability to create a cancellation quote before cancelling an order. This allows you to review the conditions of the cancellation before confirming it such as the amount of money that will be refunded and where it will be refunded to (airline credit, the original form of payment or otherwise). You can create a cancellation quote by creating a new Order Cancellation using the `id` of the order you'd like to cancel.

curl -X POST --compressed "https://api.duffel.com/air/order_cancellations"

-H "Accept-Encoding: gzip"

-H "Accept: application/json"

-H "Content-Type: application/json"

-H "Duffel-Version: v2"

-H "Authorization: Bearer $YOUR_ACCESS_TOKEN"

-d '{

"data": {

"order_id": "'"$ORDER_ID"'"

}

}'

This request will return an Order Cancellation object which contains details of the cancellation quote. It will not be confirmed however it will contain important details about the prospective cancellation that you may wish to review before confirming it. Some of the important properties of the Order Cancellation object are explained below.

{

"id": "ore_00009qzZWzjDipIkqpaUAj",

"refund_currency": "GBP",

"refund_amount": "90.80",

"expires_at": "2020-01-17T10:42:14.545052Z",

"refund_to": "original_form_of_payment"

...

}

The full schema definition can be found [in the API documentation](https://duffel.com/docs/api/order-cancellations/schema).

## Confirm Cancellation

You can confirm the cancellation if you are happy with the quote provided. Please note that you can only confirm the most recent Order Cancellation quote otherwise you will receive a `order_cancellation_stale` error. Make the following request using the unique `id` of the Order Cancellation object created previously.

curl -X POST --compressed "https://api.duffel.com/air/order_cancellations/$ORDER_CANCELLATION_ID/actions/confirm"

-H "Accept-Encoding: gzip"

-H "Accept: application/json"

-H "Duffel-Version: v2"

-H "Authorization: Bearer $YOUR_ACCESS_TOKEN"

The Order Cancellation object will be returned but it will now include a timestamp in the `confirmed_at` attribute. Your order is now cancelled and the refund offered in the quote should be applied. A cancelled order will also include the confirmed Order Cancellation object at the `cancellation` property.

## Airline Credits

Occasionally an airline will provide airline credits instead of a monetary refund when an order is cancelled which the passenger can use to get a discount on future flights. These typically take the form of a "code" that the passenger can use on the airline's website.

Cancellations that will be refunded to airline credits will have the `refund_to` property set to `airline_credits`. The unconfirmed credits will also be included in the `airline_credits` array of the Order Cancellation albeit with the `credit_code` set to `null`. You can see an example of an Order Cancellation with airline credits below.

{

"id": "ore_00009qzZWzjDipIkqpaUAj",

"refund_currency": "GBP",

"refund_amount": "90.80",

"refund_to": "airline_credits"

"airline_credits": [

{

"passenger_id": "pas_00009hj8USM7Ncg31cBCLL",

"credit_name": "Duffel Travel Credit",

"credit_currency": "GBP",

"credit_amount": "90.80"

"credit_code": "1234567890123",

...

}

]

...

}

You can view the full airline credits schema [in the API documentation](https://duffel.com/docs/api/order-cancellations/schema#order-cancellations-schema-airline-credits). We also provide a [test route](https://duffel.com/docs/api/overview/test-your-integration) from London Luton Airport (`LTN`) to London Stansted Airport (`STN`) which you can use to test your airline credits integration.

## Keep Learning

That's it! You know pretty much everything there is to know about order cancellation now. To get a complete look at this flow in our API reference you can jump to:

If you haven't learned how to add extra bags to your bookings, we recommend looking at that next:
