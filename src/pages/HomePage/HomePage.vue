<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";

import VButton from "@/components/ui/VButton/VButton.vue";
import { VInput } from "@/components/ui/VInput";

const router = useRouter();

const textRef = ref("");
</script>

<template>
  <div class="home-page page">
    HomePage
    <VButton>hui</VButton>
    <MotionDiv
      @click="router.push('/main')"
      :initial="{ x: -1000 }"
      :animate="{ x: 200 }"
      :whilePress="{ scale: 2 }"
      class="square"
    ></MotionDiv>
    <VInput v-model="textRef" placeholder="текст" />
  </div>
</template>

<style scoped lang="scss">
.square {
  margin-top: 300px;
  width: 200px;
  height: 200px;
  background-color: #00b0f0;
}
</style>
