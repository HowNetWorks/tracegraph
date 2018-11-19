<template>
  <div ref="root" style="display: inline-block; margin: 0; padding: 0; border: none;">
  </div>
</template>

<script>
import TraceGraph from "../lib/tracegraph";

export default {
  props: ["hops"],

  created() {
    this._graph = null;
  },

  mounted() {
    this._graph = new TraceGraph();
    this._graph.update(this.hops);
    this.$refs.root.appendChild(this._graph.element());
  },

  beforeDestroy() {
    this.$refs.root.removeChild(this._graph.element());
    this._graph.destroy();
  },

  watch: {
    hops() {
      this._graph.update(this.hops);
    }
  }
};
</script>
