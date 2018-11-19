<template>
  <div v-if="!hop" class="hop">
    <div class="background">
      <div class="part" v-for="(c, index) in colors" :key="index" :style="{ 'width': c.width + 'px', 'border-color': c.color }">
      </div>
    </div>
    <div class="text">
      <div class="org">TraceTrout</div>
    </div>
  </div>
  <div v-else-if="hop.ip" class="hop d-flex">
    <div class="background">
      <div class="part" v-for="(c, index) in colors" :key="index" :style="{ 'width': c.width + 'px', 'border-color': c.color }">
      </div>
    </div>
    <div class="text">
      <div>{{ hop ? hop.ip : "\u00a0" }}</div>
    </div>
  </div>
  <div v-else class="empty-hop d-flex align-items-center" :style="{ color: colors[0].color }">
    <div class="icon-clock"></div>
    <div class="label">timeout</div>
  </div>
</template>

<script>
export default {
  props: ["hop", "colors"]
};
</script>

<style scoped>
.hop {
  color: black;
  position: relative;
  text-align: left;
  font-size: 13px;
  line-height: 1em;
  padding: 5.5px 7.5px;
  transition: transform 0.04s ease;
  min-width: 2em;
  margin: 1px 3px;
}
.background {
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
  background: white;
  z-index: -1;
  display: flex;
}
.background .part {
  border-width: 1.5px;
  border-top-style: solid;
  border-bottom-style: solid;
}
.background .part:first-child {
  border-left-style: solid;
  border-top-left-radius: 3px;
  border-bottom-left-radius: 3px;
  flex: 1;
}
.background .part:last-child {
  border-right-style: solid;
  border-top-right-radius: 3px;
  border-bottom-right-radius: 3px;
  flex: 1;
}
.empty-hop {
  color: inherit;
  border-radius: 1em;
  margin: 5px 1px;
  line-height: 1em;
  background: white;
}
.empty-hop .label {
  font-size: 12px;
  padding-left: 1px;
  font-variant: small-caps;
  font-weight: lighter;
}
.empty-hop .icon-clock {
  opacity: 0.8;
}
</style>
