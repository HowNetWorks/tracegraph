# @hownetworks/tracegraph [![CircleCI](https://circleci.com/gh/HowNetWorks/tracegraph.svg?style=shield)](https://circleci.com/gh/HowNetWorks/tracegraph)

**tracegraph** is a JavaScript library for plotting graphs of traceroute or similar data.

## Installation

```sh
$ npm install @hownetworks/tracegraph
```

# Usage

```js
import { tracegraph } from "@hownetworks/tracegraph";
```

**tracegraph**()

```js
const graph = tracegraph();
```

*graph*.**horizontal**()

*graph*.**traceWidth**()

*graph*.**traceSmoothness**()

*graph*.**hopDefined**()

*graph*.**hopLevel**()

*graph*.**levelMargin**()

*graph*.**nodeSize**()

*graph*.**nodeId**()

## Helper Functions

```js
import { traceCurve, nodeGradient, genUID } from "@hownetworks/tracegraph";
```

**traceCurve**(traceSegment)

**nodeGradient**(*node*)

**genUID**()

## License

This library is MIT licensed. See [LICENSE](./LICENSE).
