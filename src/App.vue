<template>
  <graph :traces="traces"></graph>
</template>

<style src="bulma/css/bulma.min.css"></style>

<script>
import Vue from "vue";
import Graph from "./components/Graph.vue";
import Hop from "./components/Hop.vue";

const HopComponent = Vue.extend(Hop);

export default {
  data() {
    return {
      traces: [
        {
          hops: [{ ip: "a" }, { ip: "1" }, { ip: "3" }, { root: true }]
        },
        {
          hops: [{ ip: "b" }, { ip: "2" }, { ip: "q" }, { root: true }]
        },
        {
          hops: [{ ip: "c" }, { ip: "1" }, { ip: "3" }, { root: true }]
        }
      ]
    };
  },

  components: {
    Graph
  }
};
</script>
