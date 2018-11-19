import { schemeSet2 } from "d3-scale-chromatic";
import { sorted, permutations } from "./util";

function calcTTL(node, cache) {
  if (cache.has(node)) {
    return cache.get(node);
  }

  let ttl = 0;
  node.hops.forEach(hop => {
    ttl = Math.max(ttl, hop.ttl);
  });
  node.prev.forEach(prev => {
    ttl = Math.max(calcTTL(prev, cache) + 1, ttl);
  });
  cache.set(node, ttl);
  return ttl;
}

function isStart(node) {
  return node.prev.size === 0;
}

function isEnd(node) {
  return node.next.size === 0;
}

function nodeify(hops) {
  const nodes = [];
  const real = new Map();
  const virtual = new Map();
  const hopsWithNodes = hops.map(hop => {
    const groups = hop.virtual ? virtual : real;
    const grouping = hop.grouping;

    let node;
    if (groups.has(hop.grouping.key)) {
      node = groups.get(hop.grouping.key);
    } else {
      node = {
        virtual: hop.virtual,
        grouping: grouping,
        hops: [],
        ttl: 0,
        prev: new Set(),
        next: new Set(),
        traceIds: new Set()
      };
      nodes.push(node);
      groups.set(hop.grouping.key, node);
    }
    node.traceIds.add(hop.traceId);

    const hopWithNode = { ...hop, node };
    node.hops.push(hopWithNode);
    return hopWithNode;
  });

  const ttls = new Map();
  hopsWithNodes.forEach(hop => {
    if (!ttls.has(hop.traceId)) {
      ttls.set(hop.traceId, new Map());
    }
    ttls.get(hop.traceId).set(hop.ttl, hop);
  });
  hopsWithNodes.forEach(hop => {
    const prevHop = ttls.get(hop.traceId).get(hop.ttl - 1);
    if (prevHop) {
      hop.node.prev.add(prevHop.node);
      prevHop.node.next.add(hop.node);
    }
  });

  const cache = new Map();
  nodes.forEach(node => {
    node.ttl = calcTTL(node, cache);
  });
  return [nodes, hopsWithNodes];
}

function collectTraceIds(nodes) {
  const result = new Set();
  nodes.forEach(node => {
    node.traceIds.forEach(traceId => result.add(traceId));
  });
  return result;
}

function rankedNodes(traceRanks, nodes) {
  const ranks = new Map();
  nodes.forEach(node => {
    let rank = Infinity;
    node.traceIds.forEach(traceId => {
      rank = Math.min(traceRanks.get(traceId), rank);
    });
    ranks.set(node, rank);
  });
  return sorted(nodes, node => ranks.get(node));
}

function rankTraceIds(traceRanks, nodes, allowedTraces) {
  const result = new Map();
  rankedNodes(traceRanks, nodes).forEach(node => {
    const allowedHops = node.hops.filter(hop => allowedTraces.has(hop.traceId));
    sorted(allowedHops, hop => traceRanks.get(hop.traceId)).forEach(hop => {
      result.set(hop.traceId, result.size);
    });
  });
  return result;
}

function drawTrace(ctx, points, smoothness) {
  points.forEach(([x, y], index) => {
    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      const [x0, y0] = points[index - 1];
      const dy = y - y0;
      ctx.bezierCurveTo(x0, y0 + dy * smoothness, x, y - dy * smoothness, x, y);
    }
  });
}

function virtualize(hopsWithNodes) {
  const traces = new Map();
  hopsWithNodes.forEach(hop => {
    if (!traces.has(hop.traceId)) {
      traces.set(hop.traceId, [hop]);
    } else {
      traces.get(hop.traceId).push(hop);
    }
  });

  const newHops = [];
  traces.forEach(hops => {
    const sortedHops = sorted(hops, "ttl");
    sortedHops.forEach((hop, index) => {
      newHops.push({
        ...hop,
        ttl: hop.node.ttl,
        virtual: false
      });
      if (index === 0) {
        return;
      }
      const prevHop = sortedHops[index - 1];
      for (let i = prevHop.node.ttl + 1; i < hop.node.ttl; i++) {
        newHops.push({
          ...prevHop,
          ttl: i,
          virtual: true,
          grouping: {
            key: `${i}-${prevHop.grouping.key}`,
            mount: null
          }
        });
      }
    });
  });
  return newHops;
}

function uniques(hops) {
  const traces = new Map();
  hops.forEach(hop => {
    if (!traces.has(hop.traceId)) {
      traces.set(hop.traceId, [hop]);
    } else {
      traces.get(hop.traceId).push(hop);
    }
  });

  const newHops = [];
  traces.forEach(trace => {
    const counts = new Map();
    sorted(trace, "ttl").forEach(hop => {
      const grouping = hop.grouping;
      const count = counts.get(grouping.key) || 0;
      counts.set(grouping.key, count + 1);
      newHops.push({
        ...hop,
        grouping: {
          ...grouping,
          key: `${count}-${grouping.key}`
        }
      });
    });
  });
  return newHops;
}

const TRACE_LINE_WIDTH = 2.25;
const TRACE_LINE_SMOOTHNESS = 0.5;
const TRACE_MARGIN = 1;
const TTL_MARGIN_Y = 20;

function update(element, canvas, ctx, width, height, origHops) {
  const traceWidth = TRACE_LINE_WIDTH + 2 * TRACE_MARGIN;

  const uniqHops = uniques(origHops).map(hop => {
    return {
      ...hop,
      virtual: false,
      node: true
    };
  });
  const [, hopsWithNodes] = nodeify(uniqHops);
  const [nodes, hops] = nodeify(virtualize(hopsWithNodes));

  const traces = new Map();
  hops.forEach(hop => {
    if (!traces.has(hop.traceId)) {
      traces.set(hop.traceId, [hop]);
    } else {
      traces.get(hop.traceId).push(hop);
    }
  });

  const ttls = new Map();
  nodes.forEach(node => {
    const ttl = node.ttl;
    if (!ttls.has(ttl)) {
      ttls.set(ttl, [node]);
    } else {
      ttls.get(ttl).push(node);
    }
  });

  let bestTraceRanks = [];
  let minCrossings = Infinity;
  // Sort traces.keys() to make the order the permutations get iterated through
  // deterministic (assuming sorted(...) is a stable sort).
  permutations(sorted(traces.keys()), traceOrder => {
    const traceRanks = new Map();
    traceOrder.forEach((traceId, rank) => {
      traceRanks.set(traceId, rank);
    });

    let crossings = 0;
    ttls.forEach(_right => {
      const right = _right.filter(node => !isEnd(node));
      const left = new Set();
      right.forEach(node => {
        node.prev.forEach(prev => {
          if (!isStart(prev)) {
            left.add(prev);
          }
        });
      });
      const leftIds = collectTraceIds(left);
      const rightIds = collectTraceIds(right);
      const leftRanks = rankTraceIds(traceRanks, left, rightIds);
      const rightRanks = rankTraceIds(traceRanks, right, leftIds);
      leftRanks.forEach((rank, traceId) => {
        crossings += Math.max(rightRanks.get(traceId) - rank, 0);
      });
    });

    if (crossings < minCrossings) {
      minCrossings = crossings;
      bestTraceRanks = traceRanks;
    }
  });

  const orders = new Map();
  nodes.forEach(node => {
    const hops = new Map();

    let ranks = bestTraceRanks;
    if (isStart(node)) {
      ranks = new Map();

      let count = 0;
      rankedNodes(bestTraceRanks, node.next).forEach(next => {
        sorted(next.hops, hop => bestTraceRanks.get(hop.traceId)).forEach(
          hop => {
            if (!ranks.has(hop.traceId)) {
              ranks.set(hop.traceId, count);
              count += 1;
            }
          }
        );
      });
      bestTraceRanks.forEach((rank, traceId) => {
        if (!ranks.has(traceId)) {
          ranks.set(traceId, rank + count);
        }
      });
    } else if (isEnd(node)) {
      ranks = new Map();

      let count = 0;
      rankedNodes(bestTraceRanks, node.prev).forEach(prev => {
        sorted(prev.hops, hop => bestTraceRanks.get(hop.traceId)).forEach(
          hop => {
            if (!ranks.has(hop.traceId)) {
              ranks.set(hop.traceId, count);
              count += 1;
            }
          }
        );
      });
      bestTraceRanks.forEach((rank, traceId) => {
        if (!ranks.has(traceId)) {
          ranks.set(traceId, rank + count);
        }
      });
    }

    sorted(node.hops, hop => ranks.get(hop.traceId)).forEach((hop, index) => {
      hops.set(hop, index);
    });
    orders.set(node, hops);
  });

  const nodeElements = [];
  const nodeMetrics = new Map();
  ttls.forEach(nodes => {
    rankedNodes(bestTraceRanks, nodes).forEach(node => {
      let container;
      if (node.grouping.mount) {
        container = document.createElement("div");
        container.style.position = "absolute";
        container.style.marginLeft = "-10000px";
        container.style.minWidth =
          Math.ceil(traceWidth * node.hops.length) + "px";
        container.style.top = "0";
        container.style.left = "0";

        const colors = sorted(node.hops, hop => orders.get(node).get(hop)).map(
          hop => {
            return {
              color: schemeSet2[hop.traceId % schemeSet2.length],
              width: traceWidth
            };
          }
        );
        const unmount = node.grouping.mount(container, colors);
        nodeElements.push({ container, unmount });
        element.appendChild(container);
      }

      nodeMetrics.set(node, {
        element: container,

        // Filled in later
        width: 0,
        height: 0,
        x: 0,
        y: 0
      });
    });
  });

  nodes.forEach(node => {
    const nm = nodeMetrics.get(node);
    if (!nm.element) {
      return;
    }
    const rect = nm.element.getBoundingClientRect();
    nm.width = rect.width;
    nm.height = rect.height;
  });

  let maxNodeWidth = 0;
  nodeMetrics.forEach(nm => {
    maxNodeWidth = Math.max(nm.width, maxNodeWidth);
  });
  ttls.forEach(nodes => {
    const ranked = rankedNodes(bestTraceRanks, nodes);

    let width = maxNodeWidth;
    if (nodes.length >= 2) {
      const leeway = traceWidth * (traces.size - nodes.length + 1);
      width = (maxNodeWidth + leeway) / 2;
    }
    ranked.forEach((node, index) => {
      nodeMetrics.get(node).x = (index - (ranked.length - 1) / 2) * width;
    });

    let overlaps = 0;
    let maxOverlaps = 0;
    ranked.forEach(node => {
      const nm = nodeMetrics.get(node);
      if (!nm.element) {
        overlaps = 0;
      } else {
        overlaps += 1;
        maxOverlaps = Math.max(overlaps, maxOverlaps);
      }
    });
    ranked.forEach((node, index) => {
      let y = 0;
      if (maxOverlaps >= 2 && index % 2 === 0) {
        const left =
          index === 0 ? 0 : nodeMetrics.get(ranked[index - 1]).height;
        const right =
          index === ranked.length - 1
            ? 0
            : nodeMetrics.get(ranked[index + 1]).height;
        y = Math.max(left, right);
      }
      nodeMetrics.get(node).y = y;
    });
  });

  let left = Infinity;
  let right = -Infinity;
  ttls.forEach(nodes => {
    nodes.forEach(node => {
      const nm = nodeMetrics.get(node);
      left = Math.min(left, nm.x - nm.width / 2);
      right = Math.max(right, nm.x + nm.width / 2);
    });
  });
  const totalWidth = right - left;

  const hopMetrics = new Map();
  traces.forEach(hops => {
    hops.forEach(hop => {
      const nm = nodeMetrics.get(hop.node);
      const order = orders.get(hop.node).get(hop);
      const count = hop.node.hops.length;
      hopMetrics.set(hop, {
        order: order,
        count: count,
        x: nm.x + traceWidth * (order - (count - 1) / 2),
        top: 0,
        bottom: 0
      });
    });

    const sortedHops = sorted(hops, "ttl");
    for (let i = 1; i < sortedHops.length; i++) {
      const left = hopMetrics.get(sortedHops[i - 1]);
      const right = hopMetrics.get(sortedHops[i]);

      const dy = (3 / 2) * (1 - TRACE_LINE_SMOOTHNESS) * (2 * TTL_MARGIN_Y);
      const dx = (3 / 2) * (right.x - left.x);
      const normalLen = Math.sqrt(dx * dx + dy * dy);
      const offsetLen = (traceWidth * dx) / normalLen;

      // Correction
      const xfix = traceWidth - (traceWidth * dy) / normalLen;
      const slope = dx !== 0 ? dy / dx : 0;
      const yfix = slope * xfix;

      let nudge;
      if (dx > 0) {
        nudge = (left.count - left.order - 1) * (offsetLen - yfix);
      } else {
        nudge = -left.order * (offsetLen - yfix);
      }
      left.bottom = nudge;
      right.top = nudge;
    }
  });

  let totalHeight = 0;
  const ttlMetrics = new Map();
  sorted(ttls, entry => entry[0]).forEach(([ttl, nodes]) => {
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

    ttlMetrics.set(ttl, {
      top,
      height,
      y: totalHeight
    });
    totalHeight += height + top + 2 * TTL_MARGIN_Y;
  });
  totalHeight -= 2 * TTL_MARGIN_Y;

  if (width !== totalWidth || height !== totalHeight) {
    resize(canvas, ctx, totalWidth, totalHeight);
    height = totalHeight;
    width = totalWidth;
  }

  ctx.clearRect(0, 0, width, height);
  ctx.save();
  ctx.translate(width / 2, 0);
  sorted(traces.keys(), traceId => bestTraceRanks.get(traceId)).forEach(
    traceId => {
      const sortedHops = sorted(traces.get(traceId), "ttl");

      const sections = [];
      sortedHops.forEach((hop, index) => {
        if (hop.virtual) {
          return;
        }

        let cut = index - 1;
        while (cut >= 0 && sortedHops[cut].virtual) {
          cut--;
        }
        if (cut >= 0) {
          sections.push({
            hops: sortedHops.slice(cut, index + 1),
            defined: sortedHops[cut].defined && hop.defined
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
          const rtm = ttlMetrics.get(right.node.ttl);
          if (index === 0) {
            points.push([rhm.x, rtm.y + rtm.top + rnm.y + rnm.height / 2]);
            return;
          }

          const lhm = hopMetrics.get(hops[index - 1]);
          const ltm = ttlMetrics.get(hops[index - 1].node.ttl);
          const y = ltm.y + ltm.top + ltm.height + lhm.bottom;
          points.push([lhm.x, y]);
          points.push([rhm.x, y + 2 * TTL_MARGIN_Y]);

          if (index === hops.length - 1) {
            points.push([rhm.x, rtm.y + rtm.top + rnm.y + rnm.height / 2]);
          }
        });
        return { points, defined };
      });

      ctx.save();
      ctx.beginPath();
      pointSections
        .filter(section => !section.defined)
        .forEach(section => {
          drawTrace(ctx, section.points, TRACE_LINE_SMOOTHNESS);
        });
      ctx.setLineDash([4, 2]);
      ctx.lineWidth = 1;
      ctx.strokeStyle = schemeSet2[traceId % schemeSet2.length];
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.beginPath();
      pointSections
        .filter(section => section.defined)
        .forEach(section => {
          drawTrace(ctx, section.points, TRACE_LINE_SMOOTHNESS);
        });
      ctx.lineWidth = TRACE_LINE_WIDTH + 2 * Math.min(TRACE_MARGIN, 0.75);
      ctx.strokeStyle = "white";
      ctx.stroke();
      ctx.lineWidth = TRACE_LINE_WIDTH;
      ctx.strokeStyle = schemeSet2[traceId % schemeSet2.length];
      ctx.stroke();
      ctx.restore();
    }
  );

  nodes.forEach(node => {
    const nm = nodeMetrics.get(node);
    if (!nm.element) {
      return;
    }

    const tm = ttlMetrics.get(node.ttl);
    const x = nm.x + width / 2 - nm.width / 2;
    const y = tm.y + tm.top + nm.y;
    nm.element.style.transform = `translate(${x + 10000}px, ${y}px)`;
  });
  ctx.restore();
  return [width, height, nodeElements];
}

function resize(canvas, ctx, width, height) {
  const ratio = window.devicePixelRatio || 1;

  ctx.restore();
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  canvas.style.width = width + "px";
  canvas.style.height = height + "px";
  ctx.save();
  ctx.scale(canvas.width / width, canvas.height / height);
}

export default class {
  constructor() {
    this._width = 0;
    this._height = 0;
    this._updateRequest = null;
    this._hops = [];
    this._nodes = [];
    this._element = document.createElement("div");
    this._element.style.position = "relative";

    this._canvas = document.createElement("canvas");
    this._ctx = this._canvas.getContext("2d");
    this._resizeHandler = () => {
      resize(this._canvas, this._ctx, this._width, this._height);
      this._update();
    };

    this._element.appendChild(this._canvas);
    this._ctx = this._canvas.getContext("2d");
    this._ctx.save();
    resize(this._canvas, this._ctx, this._width, this._height);
    window.addEventListener("resize", this._resizeHandler, false);
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
    this._cleanup();
    window.removeEventListener("resize", this._resizeHandler, false);
  }

  update(hops) {
    this._hops = hops;
    this._update();
  }

  _cleanup() {
    this._nodes.forEach(({ container, unmount }) => {
      this._element.removeChild(container);
      unmount();
    });
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
      this._cleanup();
      [this._width, this._height, this._nodes] = update(
        this._element,
        this._canvas,
        this._ctx,
        this._width,
        this._height,
        this._hops
      );
    });
  }
}
