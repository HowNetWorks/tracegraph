<template>
  <div ref="root" style="display: inline-block; margin: 0; padding: 0; border: none;">
  </div>
</template>

<script>
import * as d3 from "d3";
import {
  tracegraph,
  traceCurve,
  nodeGradient,
  genUID
} from "../../../../src/index.js";

export default {
  props: ["traces"],

  mounted() {
    const { extent, traces, nodes } = tracegraph(this.traces, {
      horizontal: true,
      traceSmoothness: 0.5,
      nodeSize(node) {
        return node.hops[0].ip || node.hops[0].root ? [30, 30] : [10, 10];
      },
      hopDefined(hop) {
        return hop.ip || hop.root;
      },
      hopLevel(hop, index) {
        return index;
      },
      traceWidth(_, index) {
        return (index === 0 ? 7 : 2.25) + 3;
      },
      nodeId(hop, index) {
        return hop.ip || (hop.root && "root") || `empty-${index}`;
      }
    });

    const svg = d3.select(this.$refs.root).append("svg");

    const [[x0, y0], [x1, y1]] = extent;
    svg
      .attr("viewBox", `${x0} ${y0} ${x1 - x0} ${y1 - y0}`)
      .attr("width", x1 - x0)
      .attr("height", y1 - y0);

    const ids = nodes.map(() => genUID());

    const defs = svg
      .append("defs")
      .selectAll(".gradient")
      .data(nodes.map(nodeGradient));
    const stops = defs
      .enter()
      .append("linearGradient")
      .merge(defs)
      .attr("id", (_, i) => ids[i].id)
      .attr("gradientUnits", d => d.gradientUnits)
      .attr("x1", d => d.x1)
      .attr("y1", d => d.y1)
      .attr("x2", d => d.x2)
      .attr("y2", d => d.y2)
      .selectAll("stop")
      .data(d => d.stops);
    stops
      .enter()
      .append("stop")
      .merge(stops)
      .attr("offset", d => d.offset)
      .attr(
        "stop-color",
        d => d3.schemeSet2[d.traceIndex % d3.schemeSet2.length]
      );

    const traceLayer = svg
      .append("g")
      .attr("fill", "none")
      .selectAll("g")
      .data(traces)
      .enter()
      .append("g");
    traceLayer
      .filter(segment => segment.defined)
      .append("path")
      .attr("d", traceCurve())
      .attr("stroke-width", d => d.width)
      .attr("stroke", "white");
    traceLayer
      .append("path")
      .attr("d", traceCurve())
      .attr("stroke-width", d => d.width - 3)
      .attr(
        "stroke",
        segment => d3.schemeSet2[segment.index % d3.schemeSet2.length]
      )
      .attr("stroke-dasharray", segment => (segment.defined ? "" : "4 2"));

    svg
      .selectAll("circle")
      .data(nodes)
      .enter()
      .append("circle")
      .attr("fill", "white")
      .attr("stroke", (_, i) => String(ids[i]))
      .attr("stroke-width", 2)
      .attr("r", d => Math.min(d.y1 - d.y0, d.x1 - d.x0) / 2 - 1)
      .attr("cx", d => (d.x1 + d.x0) / 2)
      .attr("cy", d => (d.y1 + d.y0) / 2);
  }
};
</script>
