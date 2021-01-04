<template>
    <div id="app">
        <img alt="Vue logo" src="./assets/logo.png">
        <Crawler/>
    </div>
</template>

<script>
    import Crawler from './components/Crawler.vue'

    export default {
        name: 'App',
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
