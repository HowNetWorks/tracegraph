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

*graph(traceData)*

```js
const { traces, nodes } = graph(traceData);
```

*traces* is an array where each item is a defined/undefined segment is a trace and has the following properties:

 * *trace*.index - the index of the trace
 * *trace*.width - the width of the trace
 * *trace*.hops - the hops belonging to the trace
 * *trace*.defined - whether the segment is defined or not
 * *trace*.points - points for drawing the segment
 * *trace*.smoothness - the layout's smoothness value
 * *trace*.horizontal - whether the layout is horizontal or vertical

*nodes* is an array where each item has the following properties:

 * *node*.x0, *node*.y0, *node*.x1, *node*.y1 - the coordinates of the top-left and bottom-right corner of the node
 * *node*.horizontal - whether the layout is horizontal or vertical
 * *node*.hops - an array of hops that belong to the node
 * *node*.traceIndexes - an array of indexes of the traces that are connected to the node
 * *node*.traceStops - used for creating (optional) linear gradient for the node to match the positions of its connected traces

*graph*.**horizontal**([*horizontal*])

Defines whether the layout is either horizontal or vertical. Evaluated without arguments for each layout. 

Default: `false` (the layout is vertical)

*graph*.**traceWidth**([*width*])

Defines the width of a trace. Evaluated for each trace with the arguments `trace`, `traceIndex`, and `traces`.

Default: `1`

*graph*.**traceSmoothness**([*smoothness*])

A coefficient used in calculating the trace curves. The value should be between 0 and 1 (inclusive), a larger value generally meaning a more round appearance for the curves. Evaluated without arguments for each layout.

Default: `0.5`

*graph*.**hopDefined**([*defined*])

Tark traces a hop as either defined or undefined. Evaluated for each hop, with `hop`, `hopIndex`, `trace`, `traceIndex`, and `traces` as the arguments.

Default: `true`

*graph*.**hopLevel**([*level*])

A hop's position (depth, level) in the trace. Evaluated for each hop, with `hop`, `hopIndex`, `trace`, `traceIndex`, and `traces` as the arguments.

Default:

```js
function hopLevel(hop, hopIndex) {
  return hopIndex;
}
```

*graph*.**nodeSize**([*size*])

A node's minimum size as `[width, height]`, used for layout. The final size of the node may be larger. Evaluated without arguments for each output node, with `node` as the argument. `node` won't have its position data such as `node.x0` set, as the layout won't be finished at the time of the evaluation.

Default: `[10, 10]`

*graph*.**nodeId**([*id*])

A string identifier for the node a hop belongs to. Evaluated for each hop, with `hop`, `hopIndex`, `trace`, `traceIndex`, and `traces` as the arguments.

Default:

```js
function nodeId(hop, hopIndex, trace, traceIndex) {
  return `${traceIndex}-${hopIndex}`;
}
```

*graph*.**levelMargin**([*margin*])

Margin size around each level of nodes. Evaluated without arguments for each layout. 

Default: `10`

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
