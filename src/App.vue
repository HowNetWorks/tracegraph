<template>
  <graph :hops="hops"></graph>
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
          hops: [
            { ttl: 3, ip: "192.0.2.0" },
            { ttl: 2, ip: "192.0.2.1" },
            { ttl: 1, ip: "192.0.2.2" }
          ]
        },
        {
          hops: [
            { ttl: 3, ip: "192.0.2.0" },
            { ttl: 2, ip: "198.51.100.0" },
            { ttl: 1, ip: "198.51.100.1" }
          ]
        },
        {
          hops: [
            { ttl: 3, ip: "192.0.2.0" },
            { ttl: 2, ip: "203.0.113.0" },
            { ttl: 1, ip: "198.51.100.1" }
          ]
        }
      ]
    };
  },

  computed: {
    hops() {
      const hops = [];
      this.traces.forEach((trace, traceId) => {
        hops.push({
          traceId,
          ttl: trace.hops.length,
          defined: true,
          grouping: {
            key: "$root",
            mount(element, colors) {
              const vm = new HopComponent({ propsData: { colors, hop: null } });
              const component = vm.$mount();
              element.appendChild(component.$el);
              return () => {
                vm.$destroy();
                element.removeChild(component.$el);
              };
            }
          }
        });
        trace.hops.forEach(hop => {
          hops.push({
            traceId,
            ttl: trace.hops.length - hop.ttl,
            defined: Boolean(hop.ip),
            grouping: {
              key: hop.ip || `empty-${traceId}-${hop.ttl}`,
              mount(element, colors) {
                const vm = new HopComponent({ propsData: { colors, hop } });
                const component = vm.$mount();
                element.appendChild(component.$el);
                return () => {
                  vm.$destroy();
                  element.removeChild(component.$el);
                };
              }
            }
          });
        });
      });
      return hops;
    }
  },
  components: {
    Graph
  }
};
</script>
