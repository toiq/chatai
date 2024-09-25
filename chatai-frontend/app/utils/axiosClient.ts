import axios from "axios";
import { getCookie } from "cookies-next";

const axiosClient = axios.create({
  baseURL: "http://localhost:8000",
  headers: {
    Authorization: `Bearer ${getCookie("accessToken")}`,
  },
});

export default axiosClient;
