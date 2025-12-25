import { ref } from "vue";

/**
 * Хук для решения проблемы "холодного старта" в Chrome Kiosk.
 * Проверяет сессию и делает принудительную перезагрузку при первом запуске,
 * чтобы инициализировать GPU и таймеры браузера.
 */
export function useKioskReloadFix() {
  const isReady = ref(false);
  const RELOAD_KEY = "app_kiosk_force_reloaded";

  const hasReloaded = sessionStorage.getItem(RELOAD_KEY);

  if (hasReloaded) {
    // Это уже второй запуск (после перезагрузки) — всё ок, можно показывать приложение
    isReady.value = true;
  } else {
    // Первый запуск — ставим метку и уходим в ребут
    sessionStorage.setItem(RELOAD_KEY, "true");

    // isReady остается false, чтобы ничего не рендерить
    setTimeout(() => {
      window.location.reload();
    }, 200);
  }

  return { isReady };
}
