<script setup lang="ts">
import {
  ref,
  computed,
  onMounted,
  onBeforeUnmount,
  defineExpose,
  type Component,
} from "vue";

import {
  IconBackspace,
  IconLang,
  IconShift,
  IconClose,
} from "@/assets/icons/keyboard";

const visible = ref(false);
const inputElement = ref<HTMLInputElement | null>(null);
const type = ref<"text" | "number">("text");
const keyboardRef = ref<HTMLElement | null>(null);
const isShift = ref(false);
const language = ref<"ru" | "en">("ru");
const isFirstDigit = ref(true);
let onCloseCallback: (() => void) | null = null;

const ruLayout = [
  ["й", "ц", "у", "к", "е", "н", "г", "ш", "щ", "з", "х", "ъ"],
  ["ф", "ы", "в", "а", "п", "р", "о", "л", "д", "ж", "э"],
  ["shift", "я", "ч", "с", "м", "и", "т", "ь", "б", "ю", "backspace"],
  ["123", "смена языка", "space", "enter"],
];

const enLayout = [
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
  ["shift", "z", "x", "c", "v", "b", "n", "m", "backspace"],
  ["123", "смена языка", "space", "enter"],
];

const numberLayout = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["backspace", "0", "enter"],
];

const currentLayout = computed(() => {
  const layout =
    type.value === "number"
      ? numberLayout
      : language.value === "ru"
        ? ruLayout
        : enLayout;
  return layout.map((row) =>
    row.map((key) =>
      isShift.value && key.length === 1 ? key.toUpperCase() : key,
    ),
  );
});

function openKeyboard(
  target: HTMLInputElement,
  inputType: "text" | "number",
  onClose?: () => void,
) {
  inputElement.value = target;
  type.value = inputType;
  visible.value = true;
  isFirstDigit.value = true;
  onCloseCallback = onClose || null;
  target.focus();
}

function handleKeyClick(key: string) {
  if (!inputElement.value) return;

  switch (key) {
    case "shift":
      isShift.value = !isShift.value;
      break;
    case "123":
      setTimeout(() => {
        type.value = "number";
        isFirstDigit.value = true;
      }, 0);
      break;
    case "смена языка":
      language.value = language.value === "ru" ? "en" : "ru";
      break;
    case "space":
      inputElement.value.value += " ";
      break;
    case "enter":
      inputElement.value.dispatchEvent(new Event("input"));
      inputElement.value.dispatchEvent(
        new KeyboardEvent("keyup", { key: "Enter", bubbles: true }),
      );
      inputElement.value.blur();
      if (onCloseCallback) {
        onCloseCallback();
        onCloseCallback = null;
      }
      close();
      return;
    case "backspace":
      inputElement.value.value = inputElement.value.value.slice(0, -1);
      isFirstDigit.value = inputElement.value.value.length === 0;
      break;
    default:
      if (type.value === "number") {
        const maxPages = Number(inputElement.value.max) || Infinity;
        let newValue = isFirstDigit.value
          ? key
          : inputElement.value.value + key;
        const parsedValue = Number(newValue);

        if (!isNaN(parsedValue) && parsedValue <= maxPages) {
          inputElement.value.value = newValue;
        }
        isFirstDigit.value = false;
      } else {
        inputElement.value.value += key;
      }
  }

  inputElement.value.dispatchEvent(new Event("input"));
  inputElement.value.focus();
}

function close() {
  visible.value = false;
  if (onCloseCallback) {
    onCloseCallback();
    onCloseCallback = null;
  }
  inputElement.value = null;
  isShift.value = false;
  isFirstDigit.value = true;
}

function onClickOutside(e: MouseEvent) {
  if (
    visible.value &&
    keyboardRef.value &&
    !keyboardRef.value.contains(e.target as Node) &&
    !inputElement.value?.contains(e.target as Node)
  ) {
    close();
  }
}

function keyClass(key: string) {
  const isText = type.value !== "number";

  return {
    key: true,
    "key--wide": isText && ["shift", "backspace"].includes(key),
    "key--medium": ["123", "смена языка"].includes(key),
    "key--enter": key === "enter" && isText,
    "key--space": key === "space",
    "key--number": type.value === "number",
    "key--gray":
      isText && ["shift", "backspace", "123", "смена языка"].includes(key),
    "key--blue": key === "enter" && (!isText || type.value === "number"),
  };
}

function renderKeyLabel(key: string) {
  const map: Record<string, string> = {
    enter: "Ввод",
    space: "Пробел",
  };
  return map[key] || key;
}

function iconForKey(key: string): Component | null {
  const map: Record<string, Component> = {
    shift: IconShift,
    backspace: IconBackspace,
    "смена языка": IconLang,
  };
  return map[key] || null;
}

onMounted(() => document.addEventListener("mousedown", onClickOutside));
onBeforeUnmount(() =>
  document.removeEventListener("mousedown", onClickOutside),
);

defineExpose({ openKeyboard });
</script>

<template>
  <teleport to="body">
    <transition name="slide-up">
      <div v-if="visible" class="keyboard-overlay">
        <section class="keyboard" :class="type" ref="keyboardRef">
          <div class="keys">
            <div
              v-for="(row, rowIndex) in currentLayout"
              :key="rowIndex"
              class="row"
            >
              <button
                v-for="key in row"
                :key="key"
                :class="keyClass(key)"
                @mousedown.prevent="handleKeyClick(key)"
              >
                <component :is="iconForKey(key)" v-if="iconForKey(key)" />
                <span v-else>{{ renderKeyLabel(key) }}</span>
              </button>
            </div>
          </div>
        </section>
        <button class="close-wrapper" @click="close">
          <IconClose />
        </button>
      </div>
    </transition>
  </teleport>
</template>

<style scoped lang="scss">
.keyboard-overlay {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: linear-gradient(
    180deg,
    rgba(0, 0, 0, 0) 0%,
    rgba(0, 0, 0, 0.4) 100%
  );
}

.keyboard {
  border-radius: 16px;
  padding: 16px;
  background: #fafafa;
  width: min(90vw, 920px);

  &.number {
    width: min(90vw, 608px);
  }
}

.keys {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.row {
  display: flex;
  flex-wrap: nowrap;
  justify-content: center;
  gap: 6px;
}

.key {
  height: 48px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  box-shadow: 0 1px 0 0 rgba(0, 0, 0, 0.3);
  background: var(--just-white);
  font-weight: 500;
  font-size: 18px;
  color: var(--dark-blue);
  transition:
    background 0.2s,
    transform 0.1s;

  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;

  width: 65px;
}

.key--wide {
  width: 104px;
}

.key--medium {
  width: 72px;
}

.key--enter {
  width: 152px;
  background: var(--blue);
  color: var(--just-white);
}

.key--space {
  width: 552px;
}

.key--number {
  width: 104px;
}

.key--gray {
  background: #ebebeb;
}

.key--blue {
  background: var(--blue);
  color: white;
}

.close-wrapper {
  color: var(--dark-blue);
  background: #fafafa;
  border-radius: 16px;
  padding: 12px 24px;
  border: none;
  cursor: pointer;
  transition: background 0.2s;
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition:
    transform 0.3s ease,
    opacity 0.3s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(100%);
  opacity: 0;
}
</style>
