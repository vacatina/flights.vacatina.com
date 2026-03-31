Title: Javascript client library | Duffel Documentation

URL Source: https://duffel.com/docs/guides/javascript-client-library

Markdown Content:
## Getting Started

To make it easy to build your Duffel integration, we offer a JavaScript client library.

### Installation

To install the library using your favourite package manager:

yarn add @duffel/api

### Usage

Then import it into your codebase and initialise it with your access token:

import { Duffel } from '@duffel/api'

const duffel = new Duffel({

token: YOUR_ACCESS_TOKEN,

})

View the repository on GitHub and check out the npm package:

[![Image 1: github icon](https://assets.duffel.com/img/callout-link-logos/github.svg) duffelhq/duffel-api-javascript The JavaScript client library for the Duffel API on GitHub](https://github.com/duffelhq/duffel-api-javascript)[![Image 2: npm icon](https://assets.duffel.com/img/callout-link-logos/npm.svg) @duffel/api JavaScript client library for the Duffel API](https://www.npmjs.com/package/@duffel/api)
