<script setup lang="ts">
import {
  ref,
  computed,
  onMounted,
  onBeforeUnmount,
  defineExpose,
  nextTick,
} from "vue";
import type { Component } from "vue";

import {
  IconBackspace,
  IconBackspaceActive,
  IconLang,
  IconShift,
  IconShiftActive,
  IconShiftAll,
  IconClose,
} from "@/assets/icons/keyboard";

// --- TYPES ---
type KeyboardType = "text" | "number";
type Lang = "ru" | "en";
type ShiftState = 0 | 1 | 2;

// --- CONSTANTS (LAYOUTS) ---
const KEY_LABELS: Record<Lang, Record<string, string>> = {
  ru: { enter: "Ввод", space: "Пробел" },
  en: { enter: "Enter", space: "Space" },
};

const LAYOUTS = {
  ru: [
    ["й", "ц", "у", "к", "е", "н", "г", "ш", "щ", "з", "х", "ъ"],
    ["ф", "ы", "в", "а", "п", "р", "о", "л", "д", "ж", "э"],
    ["shift", "я", "ч", "с", "м", "и", "т", "ь", "б", "ю", "backspace"],
    ["&123", "space", "смена языка"],
  ],
  en: [
    ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
    ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
    ["shift", "z", "x", "c", "v", "b", "n", "m", "backspace"],
    ["&123", "space", "смена языка"],
  ],
  number: [
    ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
    ["/", ":", ";", "(", ")", "&", "@", "“"],
    ["shift", ".", ",", "?", "!", "‘", "backspace"],
    ["ABC", "space", "смена языка"],
  ],
  numberShift: [
    ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
    ["$", "!", ";", "?", "=", "@", "(", ")"],
    ["shift", ".", "_", "-", "+", "backspace"],
    ["ABC", "space", "смена языка"],
  ],
};

// --- STATE ---
const visible = ref(false);
const inputElement = ref<HTMLInputElement | null>(null);
const keyboardType = ref<KeyboardType>("text");
const language = ref<Lang>("ru");
const shiftState = ref<ShiftState>(0);
const keyboardRef = ref<HTMLElement | null>(null);
const isBackspacePressed = ref(false);

// Callback state
let onCloseCallback: (() => void) | null = null;
let lastShiftClickTime = 0;
let lastSpaceClickTime = 0;

// Backspace timers
let backspaceTimer: ReturnType<typeof setTimeout> | null = null;
let longPressTimer: ReturnType<typeof setTimeout> | null = null;
let backspaceStartTime = 0;
let isInteractionActive = false;

// --- COMPUTED ---
const currentLayout = computed(() => {
  let layout: string[][];

  if (keyboardType.value === "number") {
    layout = shiftState.value > 0 ? LAYOUTS.numberShift : LAYOUTS.number;
  } else {
    layout = language.value === "ru" ? LAYOUTS.ru : LAYOUTS.en;
  }

  // Применяем Shift к одиночным буквам
  if (shiftState.value > 0) {
    return layout.map((row) =>
      row.map((key) => (key.length === 1 ? key.toUpperCase() : key)),
    );
  }
  return layout;
});

// --- CORE ACTIONS ---

function openKeyboard(
  target: HTMLInputElement,
  type: KeyboardType,
  onClose?: () => void,
) {
  inputElement.value = target;
  keyboardType.value = type;
  visible.value = true;
  onCloseCallback = onClose || null;

  checkAutoCaps();

  nextTick(() => {
    target.focus();
    target.scrollIntoView({ block: "center", behavior: "smooth" });
  });
}

function close() {
  visible.value = false;
  if (onCloseCallback) {
    onCloseCallback();
    onCloseCallback = null;
  }
  inputElement.value = null;
  shiftState.value = 0;
  stopBackspace();
}

function handleShiftClick() {
  const now = Date.now();
  if (shiftState.value === 2) {
    shiftState.value = 0;
  } else if (shiftState.value === 1) {
    shiftState.value = now - lastShiftClickTime < 300 ? 2 : 0;
  } else {
    shiftState.value = 1;
  }
  lastShiftClickTime = now;
}

// --- TEXT MANIPULATION ---

function triggerInputEvent() {
  if (!inputElement.value) return;
  inputElement.value.dispatchEvent(new Event("input", { bubbles: true }));
}

function insertChar(char: string) {
  const el = inputElement.value;
  if (!el) return;

  try {
    const start = el.selectionStart;
    const end = el.selectionEnd;

    if (start !== null && end !== null) {
      const val = el.value;
      const before = val.slice(0, start);
      const after = val.slice(end);

      el.value = before + char + after;

      const newCursorPos = start + char.length;
      el.setSelectionRange(newCursorPos, newCursorPos);
    } else {
      el.value += char;
    }
  } catch {
    // Fallback если selectionStart недоступен (например type="number")
    el.value += char;
  }

  triggerInputEvent();
}

function deleteChar() {
  const el = inputElement.value;
  if (!el) return;

  const val = el.value;
  if (val.length === 0) return;

  try {
    const start = el.selectionStart;
    const end = el.selectionEnd;

    if (start !== null && end !== null) {
      if (start === end) {
        if (start > 0) {
          el.value = val.slice(0, start - 1) + val.slice(end);
          el.setSelectionRange(start - 1, start - 1);
        }
      } else {
        el.value = val.slice(0, start) + val.slice(end);
        el.setSelectionRange(start, start);
      }
    } else {
      el.value = val.slice(0, -1);
    }
  } catch {
    el.value = val.slice(0, -1);
  }

  triggerInputEvent();
}

// --- SPECIAL FEATURES ---

function tryDoubleSpaceToDot(): boolean {
  const el = inputElement.value;
  if (!el) return false;

  try {
    const start = el.selectionStart;
    if (start === null || start < 1) return false;

    const val = el.value;
    if (val[start - 1] === " ") {
      const before = val.slice(0, start - 1);
      const after = val.slice(start);

      el.value = before + ". " + after;

      const newPos = start + 1;
      el.setSelectionRange(newPos, newPos);

      triggerInputEvent();
      return true;
    }
  } catch {
    return false;
  }
  return false;
}

function checkAutoCaps() {
  if (keyboardType.value !== "text") return;
  if (shiftState.value === 2) return;

  const el = inputElement.value;
  if (!el) return;

  try {
    const start = el.selectionStart;
    const val = el.value;

    if (val.length === 0) {
      shiftState.value = 1;
      return;
    }

    if (start !== null) {
      const textBeforeCursor = val.slice(0, start);
      const sentenceEndRegex = /([.?!]\s+|\n)$/;

      if (sentenceEndRegex.test(textBeforeCursor)) {
        shiftState.value = 1;
      }
    }
  } catch {
    // ignore errors
  }
}

// --- BACKSPACE LOGIC ---

function performBackspace() {
  if (!inputElement.value) {
    stopBackspace();
    return;
  }
  deleteChar();
  checkAutoCaps();
}

function handleBackspaceRepeat() {
  performBackspace();

  if (!inputElement.value || inputElement.value.value.length === 0) {
    stopBackspace();
    return;
  }

  const elapsed = Date.now() - backspaceStartTime;
  let delay = elapsed > 3000 ? 20 : elapsed > 1500 ? 50 : 100;

  backspaceTimer = setTimeout(handleBackspaceRepeat, delay);
}

function startBackspace() {
  stopBackspace();
  isInteractionActive = true;
  isBackspacePressed.value = true;
  performBackspace();

  longPressTimer = setTimeout(() => {
    if (!isInteractionActive) return;
    backspaceStartTime = Date.now();
    handleBackspaceRepeat();
  }, 450);
}

function stopBackspace() {
  isInteractionActive = false;
  isBackspacePressed.value = false;
  if (longPressTimer) clearTimeout(longPressTimer);
  if (backspaceTimer) clearTimeout(backspaceTimer);
  longPressTimer = null;
  backspaceTimer = null;
}

// --- KEY PRESS HANDLER ---

function handleKeyClick(key: string) {
  if (!inputElement.value) return;

  switch (key) {
    case "shift":
      handleShiftClick();
      return;
    case "&123":
      keyboardType.value = "number";
      shiftState.value = 0;
      return;
    case "ABC":
      keyboardType.value = "text";
      checkAutoCaps();
      return;
    case "смена языка":
      language.value = language.value === "ru" ? "en" : "ru";
      return;
    case "backspace":
      if (!isBackspacePressed.value) performBackspace();
      return;
    case "enter":
      triggerInputEvent();
      inputElement.value.dispatchEvent(
        new KeyboardEvent("keyup", { key: "Enter", bubbles: true }),
      );
      inputElement.value.blur();
      close();
      return;
  }

  let processedDoubleSpace = false;
  if (key === "space") {
    const now = Date.now();
    if (now - lastSpaceClickTime < 300) {
      if (tryDoubleSpaceToDot()) {
        processedDoubleSpace = true;
        shiftState.value = 1;
        lastSpaceClickTime = 0;
      }
    }

    if (!processedDoubleSpace) {
      lastSpaceClickTime = now;
    }
  } else {
    lastSpaceClickTime = 0;
  }

  if (!processedDoubleSpace) {
    let charToAppend = key;
    if (key === "space") charToAppend = " ";

    insertChar(charToAppend);

    if (
      keyboardType.value === "text" &&
      shiftState.value === 1 &&
      key !== "space"
    ) {
      shiftState.value = 0;
    }
  }

  checkAutoCaps();
  inputElement.value.focus();
}

function onClickOutside(e: MouseEvent) {
  if (!visible.value || !keyboardRef.value) return;
  const target = e.target as Node;

  if (
    !keyboardRef.value.contains(target) &&
    !inputElement.value?.contains(target)
  ) {
    close();
  }
}

// --- VIEW HELPERS ---

function getKeyClass(key: string) {
  const isText = keyboardType.value !== "number";
  const isShift = shiftState.value > 0;
  const isEnter = key === "enter";

  const specialGray = [
    "shift",
    "backspace",
    "&123",
    "смена языка",
    "ABC",
  ].includes(key);
  const wideKeys = ["shift", "backspace"].includes(key);
  const langKeys = ["&123", "смена языка", "ABC"].includes(key);
  const punctKeys = [".", ",", "?", "!", "‘"].includes(key);
  const punctShiftKeys = [".", "_", "-", "+"].includes(key);

  return {
    key: true,
    "key--gray": specialGray,
    "key--wide": wideKeys,
    "key--lang": langKeys,
    "key--enter": isEnter,
    "key--blue": isEnter,
    "key--space": key === "space" && isText && language.value === "ru",
    "key--space-en": key === "space" && isText && language.value === "en",
    "key--space-number": key === "space" && !isText,
    "key--number-punct": !isText && !isShift && punctKeys,
    "key--number-punct-shift": !isText && isShift && punctShiftKeys,
  };
}

function renderKeyLabel(key: string) {
  if (key === "ABC") return language.value === "ru" ? "АБВ" : "ABC";
  return KEY_LABELS[language.value]?.[key] || key;
}

function getIconForKey(key: string): Component | string | null {
  if (key === "backspace") {
    return isBackspacePressed.value ? IconBackspaceActive : IconBackspace;
  }

  if (key === "shift") {
    if (shiftState.value === 2) return IconShiftAll;
    if (shiftState.value === 1) return IconShiftActive;
    return IconShift;
  }

  if (key === "смена языка") return IconLang;

  return null;
}

// --- LIFECYCLE ---
onMounted(() => {
  document.addEventListener("mousedown", onClickOutside);
  window.addEventListener("mouseup", stopBackspace);
  window.addEventListener("touchend", stopBackspace);
  window.addEventListener("touchcancel", stopBackspace);
});

onBeforeUnmount(() => {
  document.removeEventListener("mousedown", onClickOutside);
  window.removeEventListener("mouseup", stopBackspace);
  window.removeEventListener("touchend", stopBackspace);
  window.removeEventListener("touchcancel", stopBackspace);
});

defineExpose({ openKeyboard });
</script>

<template>
  <teleport to="body">
    <transition name="slide-up">
      <div v-if="visible" class="keyboard-overlay">
        <section class="keyboard" ref="keyboardRef">
          <div class="keys">
            <div
              v-for="(row, rowIndex) in currentLayout"
              :key="rowIndex"
              class="row"
            >
              <MotionButton
                v-for="key in row"
                :key="key"
                :class="getKeyClass(key)"
                :whilePress="{ background: 'rgba(220, 230, 239, 1)' }"
                :transition="{ duration: 0.00001 }"
                @mousedown.stop.prevent="
                  key === 'backspace' ? startBackspace() : handleKeyClick(key)
                "
                @touchstart.stop.prevent="
                  key === 'backspace' ? startBackspace() : handleKeyClick(key)
                "
                @contextmenu.prevent
              >
                <component :is="getIconForKey(key)" v-if="getIconForKey(key)" />
                <span v-else>{{ renderKeyLabel(key) }}</span>
              </MotionButton>
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
  gap: 8px;
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
  padding: 0;
  width: 65px;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;

  &--wide {
    width: 104px;
  }
  &--lang {
    width: 140px;
  }
  &--enter {
    width: 152px;
    background: var(--blue);
    color: var(--just-white);
  }
  &--space {
    width: 576px;
  }
  &--space-en {
    width: 430px;
  }
  &--space-number {
    width: 426px;
  }
  &--number-punct {
    width: 93.4px;
  }
  &--number-punct-shift {
    width: 118px;
  }
  &--gray {
    background: #ebebeb;
  }
  &--blue {
    background: var(--blue);
    color: white;
  }
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
