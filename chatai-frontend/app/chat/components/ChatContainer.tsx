"use client";
import axiosClient from "@/app/utils/axiosClient";
import { deleteCookie, getCookie } from "cookies-next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";

type User = { username: string; id: string };
const ChatContainer = ({ uuid }: { uuid?: string }) => {
  const router = useRouter();
  const [user, setUser] = useState<User>();
  const [question, setQuestion] = useState("");
  const [sseData, setSSEData] = useState<any>("");
  const [chatHistory, setChatHistory] = useState<
    { role: "user" | "assistant"; content: string }[]
  >([]);

  const [latestId, setLatestId] = useState(uuid);

  const [conversationList, setConversationList] =
    useState<{ id: string; title: string }[]>();

  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const getLatestId = async () => {
    const res = await axiosClient.get(`/auth/get-latest-id`);
    if (res?.data?.id) {
      setLatestId(res?.data?.id);
    }
  };

  const sendQuestion = async (question: string) => {
    const res = await fetch("http://localhost:8000/auth/chat", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getCookie("accessToken")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: question,
        conversation_id: uuid || latestId,
      }),
    });

    if (!latestId) await getLatestId();

    const reader = res.body
      ?.pipeThrough(new TextDecoderStream("utf-8"))
      .getReader();

    let completeMessage = "";

    while (true) {
      const { value, done } = await reader!.read();
      if (done) {
        setSSEData("");
        getLatestId();
        break;
      }

      const lines = value.split("\n");
      for (let line of lines) {
        if (line.startsWith("data: ")) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.message) {
              completeMessage += data.message;
              setSSEData(completeMessage);
            }
          } catch (error) {
            console.error("Error parsing JSON", error);
          }
        }
      }
    }
  };

  const handleSubmit = (e: any) => {
    e.preventDefault();
    sendQuestion(question);
    setChatHistory((prev) => [
      ...prev.reverse(),
      { role: "user", content: question },
    ]);
    setQuestion("");
  };

  const getChat = async () => {
    let res;
    if (uuid) {
      res = await axiosClient.get(
        `/auth/get-chat?user_id=${
          JSON.parse(getCookie("user")!).id
        }&conversation_id=${uuid}`
      );
    } else {
      res = await axiosClient.get(
        `/auth/get-chat?user_id=${JSON.parse(getCookie("user")!).id}`
      );
    }

    setChatHistory(res.data);
  };

  const getChatList = async () => {
    const res = await axiosClient.get(`/auth/get-conversations-list`);
    setConversationList(res.data);
  };
  useEffect(() => {
    setUser(JSON.parse(getCookie("user")!) as User);

    try {
      getChatList();
      getChat();
    } catch {
      getChatList();
      getChat();
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [sseData, chatHistory]);

  useEffect(() => {
    if (sseData) {
      setChatHistory((prev) => {
        const temp = prev.reverse();
        if (
          temp[temp.length - 1] &&
          temp[temp.length - 1]?.role === "user" &&
          sseData
        ) {
          return [...temp, { role: "assistant", content: sseData }];
        } else if (
          temp[temp.length - 1] &&
          temp[temp.length - 1]?.role === "assistant" &&
          sseData
        ) {
          const temp2 = temp;
          temp2[temp2.length - 1] = { role: "assistant", content: sseData };

          return temp2;
        }
        return prev;
      });
    }
  }, [sseData]);

  useEffect(() => {
    if (latestId && typeof window !== undefined) {
      // window.history.replaceState(null, "", `/chat/${latestId}`);
      // router.replace(`/chat/${latestId}`, { scroll: true });
    }
  }, [latestId]);

  return (
    <div className="h-screen bg-slate-200 flex">
      <div className="w-[25%] bg-slate-800 flex flex-col-reverse justify-between">
        <button
          className="block w-[90%] px-2 py-1 bg-slate-600 text-slate-300 my-5 mx-auto rounded-md"
          onClick={() => {
            deleteCookie("user");
            deleteCookie("accessToken");
            toast.success("Sign-out successful!");
            router.push("/");
          }}
        >
          Sign out
        </button>
        <div className="w-full flex flex-col items-start justify-normal text-white p-2 gap-3">
          <div>
            <Link
              href={"/chat"}
              className="block text-nowrap w-full px-2 py-1 bg-slate-600 text-slate-300 my-5 mx-auto rounded-md"
            >
              + New Chat
            </Link>
            <div className="flex flex-col gap-3">
              {conversationList &&
                conversationList?.map((conversation) => (
                  <Link key={conversation.id} href={`/chat/${conversation.id}`}>
                    {conversation.title}
                  </Link>
                ))}
            </div>
          </div>
        </div>
      </div>
      <div className="p-2 rounded-md bg-white w-full m-2 flex flex-col justify-between">
        <div className="h-[90%] bg-slate-200 rounded-md overflow-y-auto flex flex-col justify-end p-2">
          <div className="h-[90%] flex flex-col justify-end">
            {chatHistory &&
              chatHistory?.map((chat, i) => (
                <div key={i}>
                  <span className="font-bold">
                    {chat.role === "user" ? user?.username : "Assistant"}:{" "}
                  </span>
                  <span>
                    {chat.content}
                    {sseData && i === chatHistory.length - 1 && "┃"}
                  </span>
                </div>
              ))}

            {/* {sseData && (
              <div>
                <span className="font-bold">{"Assistant: "}</span>
                <span>{sseData}</span>
              </div>
            )} */}

            <div ref={chatEndRef} />
          </div>
        </div>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            name="question"
            id="question"
            className="w-full rounded-full px-4 py-3 bg-slate-300"
            placeholder="Write message here"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />
        </form>
      </div>
    </div>
  );
};

export default ChatContainer;
