# @hownetworks/tracegraph [![CircleCI](https://circleci.com/gh/HowNetWorks/tracegraph.svg?style=shield)](https://circleci.com/gh/HowNetWorks/tracegraph)

**tracegraph** is a JavaScript library for plotting graphs of traceroute or similar data.

## Installation

```sh
$ npm install @hownetworks/tracegraph
```

## Usage

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

```js
svg.selectAll(".trace")
  .data(traces)
  .enter().append("path")
    .attr("class", "trace")
    .attr("d", traceCurve())
    .attr("stroke-width", d => d.width)
    .attr("stroke", "red");
```

**nodeGradient**(*node*) and **genUID**()

```js
const ids = nodes.map(() => genUID());

svg.append("defs")
  .selectAll("linearGradient")
  .data(nodes.map(nodeGradient))
  .enter().append("linearGradient")
    .attr("id", (_, i) => ids[i].id)
    .attr("gradientUnits", d => d.gradientUnits)
    .attr("x1", d => d.x1)
    .attr("y1", d => d.y1)
    .attr("x2", d => d.x2)
    .attr("y2", d => d.y2)
  .selectAll("stop")
  .data(d => d.stops);
  .enter().append("stop")
    .attr("offset", d => d.offset)
    .attr("stop-color", d => ["red", "green", "blue"][d.traceIndex % 3]);
  
svg.selectAll("circle")
  .data(nodes)
  .enter().append("circle")
    .attr("fill", "white")
    .attr("stroke", (_, i) => String(ids[i]))
    .attr("r", d => 10)
    .attr("cx", d => (d.x1 + d.x0) / 2)
    .attr("cy", d => (d.y1 + d.y0) / 2);
```

## License

This library is MIT licensed. See [LICENSE](./LICENSE).
