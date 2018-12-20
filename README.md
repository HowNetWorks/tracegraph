# @hownetworks/tracegraph [![CircleCI](https://circleci.com/gh/HowNetWorks/tracegraph.svg?style=shield)](https://circleci.com/gh/HowNetWorks/tracegraph)

**tracegraph** is a JavaScript library for plotting graphs of traceroute or similar data.

Check out the small [Observable HQ notebook](https://beta.observablehq.com/@jviide/visualizing-traceroutes-feat-d3-js) demonstrating how it can be used.

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

_graph(traceData)_

```js
const layout = graph(traces);
```

_traces_ should be an array where each item has the following properties:

- _trace_.hops - an array of hops that belong to the trace, each hop can be whichever object suits your purpose

_layout_.bounds is the bounding box of the layout, returned as a [DOMRect](https://developer.mozilla.org/en-US/docs/Web/API/DOMRect)-like object with some extra convenience properties:

- _bounds_.cx, _bounds_.cy - the coordinates for the center point of the box
- _bounds_.expanded(_left_, [_top_, [_right_, _bottom_]]) - a function that returns a new box that has been expanded by the given amount(s)

_layout_.traces is an array where each item is a defined/undefined segment is a trace and has the following properties:

- _trace_.index - the index of the trace
- _trace_.width - the width of the trace
- _trace_.hops - the hops belonging to the trace
- _trace_.defined - whether the segment is defined or not
- _trace_.points - points for drawing the segment
- _trace_.smoothness - the layout's smoothness value
- _trace_.horizontal - whether the layout is horizontal or vertical

_layout_.nodes is an array where each item has the following properties:

- _node_.bounds - the bounding box of the node, returned as a [DOMRect](https://developer.mozilla.org/en-US/docs/Web/API/DOMRect)-like similar to _layout_.bounds above
- _node_.horizontal - whether the layout is horizontal or vertical
- _node_.hops - an array of hops that belong to the node
- _node_.traceIndexes - an array of indexes of the traces that are connected to the node
- _node_.traceStops - used for creating (optional) linear gradient for the node to match the positions of its connected traces

_graph_.**horizontal**([*horizontal*])

Defines whether the layout is either horizontal or vertical. Evaluated without arguments for each layout.

Default: `false` (the layout is vertical)

_graph_.**traceWidth**([*width*])

Defines the width of a trace. Evaluated for each trace with the arguments `trace`, `traceIndex`, and `traces`.

Default: `1`

_graph_.**traceSmoothness**([*smoothness*])

A coefficient used in calculating the trace curves. The value should be between 0 and 1 (inclusive), a larger value generally meaning a more round appearance for the curves. Evaluated without arguments for each layout.

Default: `0.5`

_graph_.**hopDefined**([*defined*])

Tark traces a hop as either defined or undefined. Evaluated for each hop, with `hop`, `hopIndex`, `trace`, `traceIndex`, and `traces` as the arguments.

Default: `true`

_graph_.**hopLevel**([*level*])

A hop's position (depth, level) in the trace. Evaluated for each hop, with `hop`, `hopIndex`, `trace`, `traceIndex`, and `traces` as the arguments.

Default:

```js
function hopLevel(hop, hopIndex) {
  return hopIndex;
}
```

_graph_.**nodeSize**([*size*])

A node's minimum size as `[width, height]`, used for layout. The final size of the node may be larger. Evaluated without arguments for each output node, with `node` as the argument. `node` won't have its position data such as `node.x0` set, as the layout won't be finished at the time of the evaluation.

Default: `[10, 10]`

_graph_.**nodeId**([*id*])

A string identifier for the node a hop belongs to. Evaluated for each hop, with `hop`, `hopIndex`, `trace`, `traceIndex`, and `traces` as the arguments.

Default:

```js
function nodeId(hop, hopIndex, trace, traceIndex) {
  return `${traceIndex}-${hopIndex}`;
}
```

_graph_.**levelMargin**([*margin*])

Margin size around each level of nodes. Evaluated without arguments for each layout.

Default: `10`

## Helper Functions

```js
import { traceCurve, nodeGradient, genUID } from "@hownetworks/tracegraph";
```

**traceCurve**(traceSegment)

```js
svg
  .selectAll(".trace")
  .data(traces)
  .enter()
  .append("path")
  .attr("class", "trace")
  .attr("d", traceCurve())
  .attr("stroke-width", d => d.width)
  .attr("stroke", "red");
```

**nodeGradient**(_node_) and **genUID**()

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
    .attr("cx", d => d.bounds.cx)
    .attr("cy", d => d.bounds.cy);
```

## License

This library is MIT licensed. See [LICENSE](./LICENSE).
