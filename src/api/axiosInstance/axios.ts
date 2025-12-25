import axios from "axios";

const API = window.API_URL + "/api";
export const axiosInstance = axios.create({
  baseURL: API,
});
