import * as d3 from "d3";
import util from "./util";
import calc from "./calc";

function traceCurve() {
  return function({ points, horizontal, smoothness }) {
    const ctx = d3.path();

    const len = points.length;
    for (let index = 0; index < len; index++) {
      const [x, y] = points[index];
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        const [x0, y0] = points[index - 1];
        const dx = horizontal ? x - x0 : 0;
        const dy = horizontal ? 0 : y - y0;
        ctx.bezierCurveTo(
          x0 + dx * smoothness,
          y0 + dy * smoothness,
          x - dx * smoothness,
          y - dy * smoothness,
          x,
          y
        );
      }
    }

    return "" + ctx;
  };
}

function nodeGradient(node) {
  const { horizontal, traceStops } = node;

  const start = Math.min(...traceStops.map(s => s.start));
  const end = Math.max(...traceStops.map(s => s.end));

  const stops = [];
  traceStops.forEach(s => {
    stops.push(
      {
        traceIndex: s.traceIndex,
        offset: (s.start - start) / (end - start)
      },
      {
        traceIndex: s.traceIndex,
        offset: (s.end - start) / (end - start)
      }
    );
  });

  return {
    gradientUnits: "userSpaceOnUse",
    x1: horizontal ? 0 : start,
    y1: horizontal ? start : 0,
    x2: horizontal ? 0 : end,
    y2: horizontal ? end : 0,
    stops: util.sorted(stops, "offset")
  };
}

function genUID() {
  const base = window.location.href.replace(/#.*/, "");

  for (;;) {
    const id = `uid-${Math.random()}`;
    if (!document.getElementById(id)) {
      return {
        id,
        toString() {
          return `url(${base}#${id})`;
        }
      };
    }
  }
}

function verticalGraph(origTraces, options) {
  const { traces, levels } = calc(origTraces, options);
  const traceWidths = origTraces.map((trace, index) => {
    return options.traceWidth(trace, index, origTraces);
  });

  const nodeMetrics = new Map();
  levels.forEach(nodes => {
    nodes.forEach(node => {
      const nm = {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        traceWidth: node.hops.reduce(
          (total, hop) => total + traceWidths[hop.traceIndex],
          0
        )
      };
      if (!node.virtual) {
        const [width, height] = options.nodeSize({
          hops: node.hops.map(hop => hop.origHop),
          horizontal: Boolean(options.horizontal)
        });
        nm.width = width;
        nm.height = height;
      }
      nm.width = Math.max(nm.width, nm.traceWidth);
      nodeMetrics.set(node, nm);
    });
  });

  let maxNodeWidth = 0;
  nodeMetrics.forEach(nm => {
    maxNodeWidth = Math.max(nm.width, maxNodeWidth);
  });
  const sortedTraceWidths = util.sorted(traceWidths);
  levels.forEach(nodes => {
    let width = maxNodeWidth;
    if (nodes.length >= 2) {
      const leeway = sortedTraceWidths
        .slice(nodes.length - 1)
        .reduce((acc, cur) => acc + cur, 0);
      width = (maxNodeWidth + leeway) / 2;
    }
    nodes.forEach((node, index) => {
      nodeMetrics.get(node).x += (index - (nodes.length - 1) / 2) * width;
    });

    let overlaps = 0;
    let maxOverlaps = 0;
    nodes.forEach(node => {
      if (node.virtual) {
        overlaps = 0;
      } else {
        overlaps += 1;
        maxOverlaps = Math.max(overlaps, maxOverlaps);
      }
    });
    nodes.forEach((node, index) => {
      let y = 0;
      if (maxOverlaps >= 2 && index % 2 === 0) {
        const left = index === 0 ? 0 : nodeMetrics.get(nodes[index - 1]).height;
        const right =
          index === nodes.length - 1
            ? 0
            : nodeMetrics.get(nodes[index + 1]).height;
        y += Math.max(left, right);
      }
      nodeMetrics.get(node).y = y;
    });
  });

  const hopMetrics = new Map();
  levels.forEach(nodes => {
    nodes.forEach(node => {
      const nm = nodeMetrics.get(node);

      let traceOffset = 0;
      node.hops.forEach(hop => {
        const traceWidth = traceWidths[hop.traceIndex];
        hopMetrics.set(hop, {
          traceWidth,
          traceOffset,
          x: nm.x + traceOffset + traceWidth / 2 - nm.traceWidth / 2,
          top: 0,
          bottom: 0
        });
        traceOffset += traceWidth;
      });
    });
  });

  traces.forEach(trace => {
    const hops = trace.hops;
    for (let i = 1; i < hops.length; i++) {
      const leftHop = hops[i - 1];
      const left = hopMetrics.get(leftHop);
      const right = hopMetrics.get(hops[i]);
      const lnm = nodeMetrics.get(leftHop.node);

      const dy =
        (3 / 2) * (1 - options.traceSmoothness) * (2 * options.levelMargin);
      const dx = (3 / 2) * (right.x - left.x);
      const normalLen = Math.sqrt(dx * dx + dy * dy);

      let nudge = 0;
      if (normalLen > 0) {
        // Correction
        const xfix = 1 - dy / normalLen;
        const slope = dx !== 0 ? dy / dx : 0;
        const offset = dx / normalLen - slope * xfix;

        if (dx > 0) {
          nudge =
            (lnm.traceWidth - left.traceOffset - left.traceWidth) * offset;
        } else {
          nudge = -left.traceOffset * offset;
        }
      }
      left.bottom = nudge;
      right.top = nudge;
    }
  });

  const levelMetrics = new Map();
  let totalHeight = 0;
  levels.forEach((nodes, level) => {
    let top = 0;
    nodes.forEach(node => {
      node.hops.forEach(hop => {
        const hm = hopMetrics.get(hop);
        top = Math.max(hm.top, top);
      });
    });

    let height = 0;
    nodes.forEach(node => {
      const nm = nodeMetrics.get(node);
      height = Math.max(height, nm.height + nm.y);
    });

    levelMetrics.set(level, {
      top,
      height,
      y: totalHeight
    });
    totalHeight += height + top + 2 * options.levelMargin;
  });

  const result = {
    nodes: [],
    traces: [],
    extent: null
  };

  traces.forEach((trace, traceIndex) => {
    const sections = [];

    const hops = trace.hops;
    hops.forEach((hop, index) => {
      if (hop.virtual) {
        return;
      }

      let cut = index - 1;
      while (cut >= 0 && hops[cut].virtual) {
        cut--;
      }
      if (cut >= 0) {
        sections.push({
          hops: hops.slice(cut, index + 1),
          defined: hops[cut].defined && hop.defined
        });
      }
    });

    const joinedSections = sections.splice(0, 1);
    sections.forEach(section => {
      const joined = joinedSections[joinedSections.length - 1];
      if (Boolean(section.defined) === Boolean(joined.defined)) {
        joined.hops.push(...section.hops.slice(1));
      } else {
        joinedSections.push(section);
      }
    });

    const pointSections = joinedSections.map(({ hops, defined }) => {
      const points = [];
      hops.forEach((right, index) => {
        const rhm = hopMetrics.get(right);
        const rnm = nodeMetrics.get(right.node);
        const rlm = levelMetrics.get(right.level);
        if (index === 0) {
          points.push([rhm.x, rlm.y + rlm.top + rnm.y + rnm.height / 2]);
          return;
        }

        const lhm = hopMetrics.get(hops[index - 1]);
        const llm = levelMetrics.get(hops[index - 1].level);
        const y = llm.y + llm.top + llm.height + lhm.bottom;
        points.push([lhm.x, y]);
        points.push([rhm.x, y + 2 * options.levelMargin]);

        if (index === hops.length - 1) {
          points.push([rhm.x, rlm.y + rlm.top + rnm.y + rnm.height / 2]);
        }
      });
      return { points, defined };
    });

    pointSections.forEach(section => {
      result.traces.push({
        index: traceIndex,
        width: traceWidths[traceIndex],
        hops: trace.hops.map(hop => hop.origHop),
        defined: section.defined,
        points: section.points,
        smoothness: options.traceSmoothness,
        horizontal: Boolean(options.horizontal)
      });
    });
  });

  let left = levels.length === 0 ? 0 : Infinity;
  let right = levels.length === 0 ? 0 : -Infinity;
  let top = levels.length === 0 ? 0 : Infinity;
  let bottom = levels.length === 0 ? 0 : -Infinity;
  levels.forEach(nodes => {
    nodes.forEach(node => {
      const nm = nodeMetrics.get(node);
      const lm = levelMetrics.get(node.level);
      const x0 = nm.x - nm.width / 2;
      const x1 = nm.x + nm.width / 2;
      const y0 = lm.y + lm.top + nm.y;
      const y1 = y0 + nm.height;

      left = Math.min(x0, left);
      right = Math.max(x1, right);
      top = Math.min(y0, top);
      bottom = Math.max(y1, bottom);
      if (node.virtual) {
        return;
      }

      let offset = (x0 + x1) / 2 - nm.traceWidth / 2;
      const traceStops = node.hops.map(hop => {
        const start = offset;
        offset += traceWidths[hop.traceIndex];
        return {
          start,
          end: offset,
          traceIndex: hop.traceIndex
        };
      });
      result.nodes.push({
        x0,
        y0,
        x1,
        y1,
        hops: node.hops.map(hop => hop.origHop),
        traceIndexes: node.hops.map(hop => hop.traceIndex),
        traceStops,
        horizontal: Boolean(options.horizontal)
      });
    });
  });

  result.extent = [[left, top], [right, bottom]];
  return result;
}

function flip(points) {
  return points.map(([x, y]) => [y, x]);
}

function tracegraph(hops, _options) {
  const options = {
    horizontal: false,
    traceWidth: () => 2,
    nodeSize: () => [20, 20],
    nodeId: (hop, hopIndex, trace, traceIndex) => `${traceIndex}-${hopIndex}`,
    hopDefined: () => true,
    levelMargin: 20,
    traceSmoothness: 0.33,
    ..._options
  };

  if (options.horizontal) {
    const nodeSize = options.nodeSize;
    options.nodeSize = (...args) => {
      const [w, h] = nodeSize(...args);
      return [h, w];
    };
  }

  const result = verticalGraph(hops, options);
  if (options.horizontal) {
    result.extent = flip(result.extent);
    result.traces = result.traces.map(trace => ({
      ...trace,
      points: flip(trace.points)
    }));
    result.nodes = result.nodes.map(node => ({
      ...node,
      x0: node.y0,
      y0: node.x0,
      x1: node.y1,
      y1: node.x1
    }));
  }
  return result;
}

export default class {
  constructor() {
    this._width = 0;
    this._height = 0;
    this._updateRequest = null;
    this._traces = [];
    this._nodes = [];
    this._element = document.createElement("div");
    this._element.style.position = "relative";
    this._element.style.width = "3000px";
    this._element.style.height = "1000px";
    this._element.style.display = "flex";

    this._update();
  }

  element() {
    return this._element;
  }

  destroy() {
    if (this._updateRequest !== null) {
      cancelAnimationFrame(this._updateRequest);
      this._updateRequest = null;
    }
  }

  update(traces) {
    this._traces = traces;
    this._update();
  }

  _update() {
    if (this._updateRequest !== null) {
      return;
    }
    this._updateRequest = requestAnimationFrame(() => {
      if (this._updateRequest === null) {
        return;
      }
      this._updateRequest = null;
      const { extent, traces, nodes } = tracegraph(this._traces, {
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

      const svg = d3.select(this._element).append("svg");

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
    });
  }
}
