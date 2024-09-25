"use client";
import { getCookie } from "cookies-next";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const router = useRouter();
  useEffect(() => {
    const accessToken = getCookie("accessToken");
    if (accessToken) {
      router.push("/chat");
    } else {
      router.push("/auth");
    }
  }, []);
  return <></>;
}
