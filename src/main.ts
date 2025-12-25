import "@/assets/styles/main.scss";

import { VueQueryPlugin } from "@tanstack/vue-query";
import { createPinia } from "pinia";
import { createApp } from "vue";

import App from "./App.vue";

import { queryClient } from "@/api/queryClient/queryClient.ts";
import motionPlugin from "@/plugins/motion";
import router from "@/router";

const app = createApp(App);

app
  .use(VueQueryPlugin, {
    enableDevtoolsV6Plugin: true,
    queryClient,
  })
  .use(motionPlugin)
  .use(router)
  .use(createPinia());

app.mount("#app");
