<script setup lang="ts">
import { provide, ref } from "vue";
import { useRoute } from "vue-router";

import { Keyboard } from "@/components/ui/Keyboard";
import { useInactivity } from "@/utils/useInactivity/useInactivity.ts";
import { useKioskReloadFix } from "@/utils/useKioskReloadFix/useKioskReloadFix.ts";

const route = useRoute();

const keyboardRef = ref<InstanceType<typeof Keyboard> | null>(null);

provide(
  "openKeyboard",
  (el: HTMLInputElement, type: "text" | "number", onClose?: () => void) => {
    keyboardRef.value?.openKeyboard(el, type, onClose);
  },
);

const { isReady } = useKioskReloadFix();

if (isReady.value) {
  useInactivity();
}
</script>

<template>
  <main v-if="isReady" class="main">
    <RouterView v-slot="{ Component }">
      <template v-if="Component">
        <transition name="fade" mode="out-in">
          <suspense>
            <component :is="Component" :key="route.fullPath"></component>
          </suspense>
        </transition>
      </template>
    </RouterView>
    <Keyboard ref="keyboardRef" />
  </main>
</template>

<style scoped></style>
