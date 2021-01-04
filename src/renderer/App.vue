<template>
  <div id="app">
    <img alt="Crawl logo" src="../logo.png">
    <Crawler/>
  </div>
</template>

<script>
import Crawler from './components/Crawler.vue'

export default {
  name: 'weibo_pic_downloader',
  components: {
    Crawler
  }
}

</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>
