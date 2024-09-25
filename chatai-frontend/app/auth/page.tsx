"use client";
import { getCookie, setCookie } from "cookies-next";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import axiosClient from "../utils/axiosClient";

const AuthPage = () => {
  const [userName, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const accessToken = getCookie("accessToken");
    if (accessToken) {
      router.push("/chat");
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const res = await axiosClient.post(
        `auth/${isLogin ? "login" : "register"}`,
        {
          username: userName,
          password,
        }
      );

      if (isLogin) {
        setCookie("accessToken", res.data.access_token);
        setCookie("user", JSON.stringify(res.data.user));
        toast.success("Successfully logged in!");
        router.push("/chat");
      } else {
        toast.success("Successfully registered! Please login.");
      }
    } catch (e) {
      toast.error("Failed!");
    }
  };
  return (
    <div className="flex flex-col items-center justify-center bg-slate-200 h-screen">
      <div className="w-[320px] flex items-center justify-between mb-5 text-md p-1.5 rounded-md bg-slate-900">
        <button
          className={`w-1/2 rounded-sm ${
            isLogin ? "text-slate-200" : "bg-white text-black"
          }`}
          onClick={() => setIsLogin(false)}
        >
          Register
        </button>
        <button
          className={`w-1/2 rounded-sm ${
            isLogin ? "bg-white text-black" : "text-slate-200"
          }`}
          onClick={() => setIsLogin(true)}
        >
          Login
        </button>
      </div>
      <form onSubmit={handleSubmit} className="w-[320px] flex flex-col gap-y-2">
        <input
          type="text"
          name="username"
          id="username"
          placeholder="Enter username"
          className="px-2 py-1 rounded-sm"
          onChange={(e) => setUserName(e.target.value)}
          required
        />

        <input
          type="password"
          name="password"
          id="password"
          placeholder="Enter password"
          className="px-2 py-1 rounded-sm"
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <input
          type="submit"
          value="Submit"
          className="mt-1 block bg-black rounded-sm px-2 py-1 text-white hover:bg-opacity-80 cursor-pointer"
        />
      </form>
    </div>
  );
};

export default AuthPage;
