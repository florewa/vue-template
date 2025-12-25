<script setup lang="ts">
import { defineProps, defineEmits, ref, defineExpose, inject } from "vue";

type InputType = "text" | "password" | "email" | "number";

const props = defineProps<{
  modelValue: string | number;
  type?: InputType;
  placeholder?: string;
  disabled?: boolean;
  question?: boolean;
  error?: string;
  onKeyboardClose?: () => void;
}>();

const emit = defineEmits(["update:modelValue"]);

const openKeyboard =
  inject<
    (
      el: HTMLInputElement,
      type: "text" | "number",
      onClose?: () => void,
    ) => void
  >("openKeyboard");

const inputElement = ref<HTMLInputElement | null>(null);

function handleFocus() {
  if (inputElement.value && openKeyboard) {
    const type = props.type === "number" ? "number" : "text";
    openKeyboard(inputElement.value, type, props.onKeyboardClose);
  }
}

defineExpose({
  inputElement,
});
</script>

<template>
  <div class="input-wrapper">
    <span class="prefix">
      <slot name="prefix" />
    </span>
    <input
      ref="inputElement"
      :type="props.type || 'text'"
      :value="props.modelValue"
      @input="
        emit('update:modelValue', ($event.target as HTMLInputElement).value)
      "
      @focus="handleFocus"
      :placeholder="props.placeholder"
      :disabled="props.disabled"
    />
    <span class="suffix">
      <slot name="suffix" />
    </span>
  </div>
</template>

<style scoped lang="scss">
.input-wrapper {
  position: relative;
  width: 100%;

  .prefix,
  .suffix {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    display: flex;
    align-items: center;
  }

  .prefix {
    left: 16px;
  }

  .suffix {
    right: 16px;
    cursor: pointer;
  }

  input {
    width: 100%;
    padding: 16px 48px;
    border-radius: 24px;
    border: 2px solid transparent;
    font-size: 20px;
    color: var(--dark-blue);
    background: var(--just-white);

    &::placeholder {
      font-weight: 700;
      font-size: 20px;
      color: var(--dark-blue);
    }

    &:focus {
      border-color: var(--blue);
      outline: none;
    }
  }
}
</style>
