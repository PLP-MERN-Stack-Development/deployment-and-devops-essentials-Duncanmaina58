// client/src/pages/ChatPage.jsx
import { useEffect, useState, useRef, useCallback } from "react";
import API from "../api/axios";
import { socket, connectSocket } from "../socket/socket";
import { useAuth } from "../context/AuthContext";
import ContactsSidebar from "../components/ContactsSidebar";
import moment from "moment";
import { Paperclip, Smile, Send, LogOut, Check, CheckCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";

// Custom Hook to manage activeChat persistence
const useActiveChatPersistence = () => {
  const [activeChatId, setActiveChatId] = useState(() => {
    // Get the stored ID on initial load
    return localStorage.getItem("activeChatId");
  });

  // Update localStorage whenever activeChatId changes
  useEffect(() => {
    if (activeChatId) {
      localStorage.setItem("activeChatId", activeChatId);
    } else {
      localStorage.removeItem("activeChatId");
    }
  }, [activeChatId]);

  return [activeChatId, setActiveChatId];
};

export default function ChatPage() {
  const { token, logout } = useAuth();
  const user = JSON.parse(localStorage.getItem("user"));
  const navigate = useNavigate();

  // 1. 🟢 Use custom hook for persistent chat ID
  const [activeChatId, setActiveChatId] = useActiveChatPersistence();
  
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [typing, setTyping] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const activeChatRef = useRef(null);
  const messageEndRef = useRef(null);

  // Combine activeChat setting and persistence update
  const updateActiveChat = useCallback((chat) => {
    setActiveChat(chat);
    setActiveChatId(chat?._id || null);
  }, [setActiveChatId]);

  // 🟢 Connect socket when logged in
  useEffect(() => {
    const savedToken = token || localStorage.getItem("token");
    if (savedToken) {
      connectSocket(savedToken);
    } else {
      const timeout = setTimeout(() => navigate("/login"), 500);
      return () => clearTimeout(timeout);
    }
  }, [token, navigate]);

  // 🟢 Join user room
  useEffect(() => {
    if (!user?._id) return;
    socket.emit("setup", user);
    socket.on("connected", () => console.log("✅ Socket connected"));
    socket.on("onlineUsers", (users) => setOnlineUsers(users));

    return () => {
      socket.off("onlineUsers");
      socket.off("connected");
    };
  }, [user]);

  useEffect(() => {
    activeChatRef.current = activeChat;
  }, [activeChat]);

  // 🟢 Handle incoming messages
  useEffect(() => {
    const handleMessageReceived = (msg) => {
      const currentChat = activeChatRef.current;
      if (msg.chat === currentChat?._id || msg.chat?._id === currentChat?._id) {
        setMessages((prev) => {
          const existingIndex = prev.findIndex((m) => m.tempId && m.tempId === msg.tempId);
          if (existingIndex !== -1) {
            const newMsgs = [...prev];
            newMsgs[existingIndex] = msg;
            return newMsgs;
          }
          if (!prev.some((m) => m._id === msg._id)) {
            return [...prev, msg];
          }
          return prev;
        });
      }
    };

    socket.on("message:received", handleMessageReceived);
    socket.on("userTyping", (chatId) => {
      if (chatId === activeChatRef.current?._id) setIsTyping(true);
    });
    socket.on("userStopTyping", (chatId) => {
      if (chatId === activeChatRef.current?._id) setIsTyping(false);
    });

    return () => {
      socket.off("message:received", handleMessageReceived);
      socket.off("userTyping");
      socket.off("userStopTyping");
    };
  }, []);

  // 🟢 Fetch chat details and messages on initial load if ID exists
  useEffect(() => {
    if (token && activeChatId && !activeChat) {
      const fetchChatDetails = async () => {
        try {
          // Fetch chat details
          const chatRes = await API.get(`/api/chats/${activeChatId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const chat = chatRes.data;
          setActiveChat(chat);
          socket.emit("join_chat", chat._id);

          // Fetch messages
          const messagesRes = await API.get(`/api/messages/${chat._id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          setMessages(messagesRes.data);
          scrollToBottom();
        } catch (err) {
          console.error("Failed to load persistent chat:", err);
          // Clear the stored ID if the chat couldn't be loaded (e.g., deleted chat)
          setActiveChatId(null);
        }
      };
      fetchChatDetails();
    }
  }, [token, activeChatId, activeChat, setActiveChatId]);


  // 🟢 Open chat and fetch messages (Updated to use updateActiveChat)
  async function openChatFromSidebar(chat) {
    updateActiveChat(chat); // Update state AND persistence
    try {
      const { data } = await API.get(`/api/messages/${chat._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMessages(data);
      socket.emit("join_chat", chat._id);
      scrollToBottom();
    } catch (err) {
      console.error("Failed to load messages:", err);
    }
  }

  // 🟢 Send message
  const sendMessage = async () => {
    if (!text.trim() && !file) return;

    if (file) {
      const form = new FormData();
      form.append("chatId", activeChat._id);
      if (text) form.append("content", text);
      form.append("file", file);

      try {
        await API.post("/api/messages", form, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        });
        setFile(null);
      } catch (err) {
        console.error("File upload error:", err);
        return;
      }
    } else if (text.trim()) {
      const tempId = Date.now().toString();
      const tempMessage = {
        _id: null,
        tempId: tempId,
        content: text,
        sender: { _id: user._id, username: user.username },
        createdAt: new Date(),
        readBy: [{ _id: user._id }],
      };
      setMessages((prev) => [...prev, tempMessage]);

      socket.emit("new_message", {
        chatId: activeChat._id,
        content: text,
        tempId: tempId,
      });
    }

    setText("");
    setTyping(false);
    socket.emit("stopTyping", activeChat._id);
    scrollToBottom();
  };

  // Typing indicator
  const handleTyping = (e) => {
    setText(e.target.value);
    if (!typing) {
      setTyping(true);
      socket.emit("typing", activeChat._id);
    }
    const timeout = setTimeout(() => {
      setTyping(false);
      socket.emit("stopTyping", activeChat._id);
    }, 2000);
    return () => clearTimeout(timeout);
  };

  // Auto-scroll
  const scrollToBottom = () => messageEndRef.current?.scrollIntoView({ behavior: "smooth" });

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 🟢 Render
  return (
    <div className="h-screen flex bg-gray-100">
      {/* Sidebar */}
      <ContactsSidebar onOpenChat={openChatFromSidebar} />

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-[url('/chat-bg.png')] bg-cover">
        {/* Header */}
        <div className="flex items-center justify-between p-3 bg-green-700 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white text-green-700 flex items-center justify-center font-bold">
              {user?.username?.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold">{user?.username}</p>
              <p className="text-sm text-green-100">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-1 bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-md"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>

        {/* Active Chat */}
        {activeChat ? (
          <>
            <div className="flex items-center justify-between p-3 bg-green-600 text-white border-b border-green-700">
              <div>
                {activeChat.isGroup
                  ? activeChat.chatName
                  : activeChat.users
                      .filter((u) => u._id !== user._id)
                      .map((u) => (
                        <span key={u._id}>
                          {u.username}{" "}
                          <span className="text-xs text-green-200">
                            {onlineUsers.includes(u._id) ? "Online" : "Offline"}
                          </span>
                        </span>
                      ))}
                {isTyping && (
                  <span className="italic text-sm text-yellow-200 ml-2">typing...</span>
                )}
              </div>
            </div>

            {/* 🟢 Messages */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col space-y-2">
              {messages.map((m) => {
                const isMine =
                  m?.sender?._id === user?._id ||
                  m?.senderId === user?._id ||
                  m?.user === user?._id;

                return (
                  <div key={m._id || m.tempId} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[75%] px-4 py-2 rounded-2xl text-sm shadow-md ${
                        isMine
                          ? "bg-green-500 text-white rounded-br-none"
                          : "bg-white text-gray-800 rounded-bl-none"
                      }`}
                    >
                      {activeChat.isGroup && !isMine && (
                        <p className="font-bold text-xs mb-1 text-green-700">
                          {m.sender?.username}
                        </p>
                      )}
                      {m.media?.url && (
                        <img
                          src={m.media.url}
                          alt="media"
                          className="rounded-lg mb-1 max-w-full"
                        />
                      )}
                      <p>{m.content}</p>
                      <div
                        className={`text-[10px] mt-1 flex items-center gap-1 ${
                          isMine ? "justify-end text-green-100" : "justify-start text-gray-400"
                        }`}
                      >
                        {moment(m.createdAt).format("HH:mm")}
                        {isMine && (
                          <>
                            {m.readBy?.length > 1 ? (
                              <CheckCheck size={12} className="text-blue-300" />
                            ) : (
                              <Check size={12} className="text-gray-300" />
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messageEndRef} />
            </div>

            {/* Input */}
            <div className="p-3 flex items-center gap-3 border-t bg-white">
              <label htmlFor="file" className="cursor-pointer">
                <Paperclip size={22} />
              </label>
              <input
                id="file"
                type="file"
                className="hidden"
                onChange={(e) => setFile(e.target.files[0])}
              />
              <Smile size={22} className="cursor-pointer" />
              <input
                type="text"
                value={text}
                onChange={handleTyping}
                placeholder="Type a message"
                className="flex-1 border rounded-full px-4 py-2 text-sm focus:outline-none"
              />
              <button
                onClick={sendMessage}
                className="bg-green-600 hover:bg-green-700 text-white rounded-full p-2"
              >
                <Send size={20} />
              </button>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center flex-1 text-gray-500">
            Select a chat to start messaging
          </div>
        )}
      </div>
    </div>
  );
}
