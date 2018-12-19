import * as util from "./util";

function calcLevel(node, cache) {
  if (cache.has(node)) {
    return cache.get(node);
  }
  let level = node.hops.reduce((level, hop) => Math.max(level, hop.level), 0);
  node.prev.forEach(prev => {
    level = Math.max(calcLevel(prev, cache) + 1, level);
  });
  cache.set(node, level);
  return level;
}

function nodeify(_traces) {
  // Turn hops into nodes and augment hops with nodes.
  // Return a new, better trace.

  const nodes = new Map();
  const traces = _traces.map(trace => {
    const hops = trace.hops.map(hop => {
      const nodeId = `${hop.virtual ? "virtual" : "real"}-${hop.nodeId}`;
      const node = nodes.get(nodeId) || {
        id: nodeId,
        virtual: hop.virtual,
        hops: [],
        level: 0,
        prev: new Set(),
        next: new Set(),
        traceIndexes: new Set()
      };
      nodes.set(nodeId, node);

      const newHop = {
        ...hop,
        nodeId,
        node
      };
      node.hops.push(newHop);
      node.traceIndexes.add(newHop.traceIndex);
      return newHop;
    });
    return {
      ...trace,
      hops
    };
  });

  traces.forEach(trace => {
    const hops = util.sorted(trace.hops, "level");
    for (let i = 1; i < hops.length; i++) {
      const left = hops[i - 1];
      const right = hops[i];
      if (right.level === left.level + 1) {
        right.node.prev.add(left.node);
        left.node.next.add(right.node);
      }
    }
  });

  const cache = new Map();
  nodes.forEach(node => {
    node.level = calcLevel(node, cache);
    node.hops.forEach(hop => (hop.level = node.level));
  });
  return traces;
}

function virtualize(traces) {
  return traces.map(trace => {
    const newHops = [];

    const hops = util.sorted(trace.hops, "level");
    hops.forEach((hop, index) => {
      if (index > 0) {
        const prev = hops[index - 1];
        for (let i = prev.level + 1; i < hop.level; i++) {
          newHops.push({
            ...prev,
            level: i,
            virtual: true,
            nodeId: `${i}-${prev.nodeId}`
          });
        }
      }
      newHops.push({
        ...hop,
        nodeId: `${hop.level}-${hop.nodeId}`
      });
    });
    return {
      ...trace,
      hops: newHops
    };
  });
}

function uniques(hops) {
  // Create multiple hops if one trace contains the same grouping key several times

  const counts = new Map();
  return util.sorted(hops, "level").map(hop => {
    const nodeId = hop.nodeId;
    const count = counts.get(nodeId) || 0;
    counts.set(nodeId, count + 1);
    return {
      ...hop,
      nodeId: `${count}-${nodeId}`
    };
  });
}

function collectLevels(traces) {
  let maxLevel = 0;
  traces.forEach(trace => {
    trace.hops.forEach(hop => {
      maxLevel = Math.max(maxLevel, hop.level);
    });
  });

  const levels = new Array(maxLevel + 1);
  for (let i = 0; i < levels.length; i++) {
    levels[i] = new Set();
  }
  traces.forEach(trace => {
    trace.hops.forEach(hop => {
      levels[hop.level].add(hop.node);
    });
  });

  return levels.map(nodes => {
    return Array.from(nodes);
  });
}

function rankedNodes(nodes, traceRanks) {
  const nodeRanks = new Map();
  nodes.forEach(node => {
    let rank = Infinity;
    node.traceIndexes.forEach(traceIndex => {
      rank = Math.min(rank, traceRanks[traceIndex]);
    });
    nodeRanks.set(node, rank);
  });
  return util.sorted(nodes, node => nodeRanks.get(node));
}

function rankedHops(hops, traceRanks) {
  return util.sorted(hops, hop => traceRanks[hop.traceIndex]);
}

function countCrossings(traces, levels, traceRanks) {
  const hopRanks = new Map();
  levels.forEach(nodes => {
    let rank = 0;
    rankedNodes(nodes, traceRanks).forEach(node => {
      rankedHops(node.hops, traceRanks).forEach(hop => {
        hopRanks.set(hop, rank);
        rank += 1;
      });
    });
  });

  let crossings = 0;
  traces.forEach(trace => {
    const hops = trace.hops;
    for (let i = 0; i < hops.length - 1; i++) {
      crossings += Math.abs(hopRanks.get(hops[i]) - hopRanks.get(hops[i + 1]));
    }
  });

  return crossings;
}

export default function(origTraces, options) {
  const enrichedTraces = origTraces.map((trace, traceIndex) => {
    const hops = trace.hops.map((hop, hopIndex) => ({
      traceIndex,
      hopIndex,
      nodeId: options.nodeId(hop, hopIndex, trace, traceIndex, origTraces),
      node: null,
      defined: options.hopDefined(hop, hopIndex, trace, traceIndex, origTraces),
      level: options.hopLevel(hop, hopIndex, trace, traceIndex, origTraces),
      virtual: false,
      origHop: hop
    }));
    return {
      hops: uniques(hops)
    };
  });
  const traces = nodeify(virtualize(nodeify(enrichedTraces))).map(trace => ({
    ...trace,
    hops: util.sorted(trace.hops, "level")
  }));
  const levels = collectLevels(traces);

  let bestTraceRanks = [];
  let minCrossings = Infinity;
  util.permutations(traces.map((_, index) => index), traceRanks => {
    const crossings = countCrossings(traces, levels, traceRanks);
    if (crossings < minCrossings) {
      minCrossings = crossings;
      bestTraceRanks = traceRanks;
    }
  });

  levels.forEach(nodes => {
    nodes.forEach(node => {
      node.hops = rankedHops(node.hops, bestTraceRanks);
    });
  });

  return {
    traces,
    levels: levels.map(nodes => rankedNodes(nodes, bestTraceRanks))
  };
}
