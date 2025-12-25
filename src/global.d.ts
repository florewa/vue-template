export {};

declare module "*.vue" {
  import Vue from "vue";
  export default Vue;
}

declare global {
  interface Window {
    API_URL: string;
    TIMEOUT: number;
    EXITER_PIN: number;
    EXITER_HOLD_TIMEOUT: number;
    EXITER_URL: string;
  }
}
