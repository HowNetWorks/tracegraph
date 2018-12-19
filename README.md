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

*graph(traces)*

*graph*.**horizontal**([*horizontal*])

If *horizontal* is defined then its value is used to define whether the layout is either horizontal or vertical. If *horizontal* is a function, then it's evaluated (without arguments) on every layout and the result is used. Otherwise the value is used as-is.

If *horizontal* is not specified then return the current. The default is `false` (the layout is vertical).

*graph*.**traceWidth**([*width*])

If *width* is specified then its value is used as the trace width. If *width* is a function then it's evaluated for each trace to define the trace's width, with `trace`, `traceIndex`, and `traces` as the arguments. Otherwise the value is just used as-is.

If *width* is not specified then return the current trace width value or function. The default is `1`.

*graph*.**traceSmoothness**()

The default is `0.5`.

*graph*.**hopDefined**()

The default is `true`.

*graph*.**hopLevel**()

The default is the following function:

```js
function hopLevel(hop, hopIndex, trace, traceIndex, traces) {
  return hopIndex;
}
```

*graph*.**levelMargin**()

The default is `10`.

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
