import { useEffect, useState } from "react";
import API from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { socket } from "../socket/socket";
import { PlusCircle, Users2, Circle, Search } from "lucide-react";
import axios from "axios";

export default function ContactsSidebar({ onOpenChat }) {
  const { token, user } = useAuth();
  const [users, setUsers] = useState([]);
  const [chats, setChats] = useState([]);
  // 🌟 NEW STATE for New Chat Modal 🌟
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState({});
  const [searchQuery, setSearchQuery] = useState("");

  // 🟢 Connect socket & track presence
  useEffect(() => {
    if (!token || !user) return;

    socket.auth = { token };
    socket.connect();

    socket.on("presence:update", ({ userId, isOnline }) => {
      setOnlineUsers((prev) => ({
        ...prev,
        [userId]: isOnline,
      }));
    });

    return () => {
      socket.off("presence:update");
      socket.disconnect();
    };
  }, [token, user]);

  // 🟢 Fetch chats
  useEffect(() => {
    if (!token) return;

    const fetchChats = async () => {
      try {
        const { data } = await API.get("/api/chat", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setChats(data.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)));
      } catch (err) {
        console.error("Failed to load chats:", err);
      }
    };

    fetchChats();

    socket.on("chat:updated", (chat) => {
      setChats((prev) => {
        const exists = prev.find((c) => c._id === chat._id);
        const updatedList = exists
          ? prev.map((c) => (c._id === chat._id ? chat : c))
          : [chat, ...prev];
        return updatedList.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      });
    });

    return () => socket.off("chat:updated");
  }, [token]);

  // 🟢 Fetch users
  const fetchUsers = async () => {
    if (!token) return;
    try {
      const { data } = await API.get("/api/users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      // Filter out the current user
      setUsers(data.filter((u) => u._id !== user._id));
    } catch (err) {
      console.error("Error loading users:", err);
    }
  };

  // 🟢 Access or create private chat
  const accessChat = async (userId) => {
    try {
      const { data } = await axios.get(
        `https://chatapp-ktbk.onrender.com/api/chat/private/${userId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      onOpenChat(data);
      socket.emit("join_chat", data._id);
      // 🌟 Close New Chat Modal 🌟
      setShowNewChatModal(false);
      // Reset search/users list if needed (optional)
      setSearchQuery("");
    } catch (err) {
      console.error("Access chat error:", err);
    }
  };

  // 🟢 Open existing chat
  const openExistingChat = (chat) => {
    onOpenChat(chat);
    socket.emit("join_chat", chat._id);
  };

  // 🟢 Create group
  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedUsers.length < 1) {
      alert("Enter a name & select at least 1 member (the creator is included automatically).");
      return;
    }
    
    // Ensure the creator's ID is included
    const creatorId = user._id;
    const finalUserIds = Array.from(new Set([...selectedUsers, creatorId]));

    try {
      const { data } = await API.post(
        "/api/chat/group",
        { name: groupName, userIds: finalUserIds },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setChats((prev) => [data, ...prev]);
      setShowGroupModal(false);
      setGroupName("");
      setSelectedUsers([]);
    } catch (err) {
      console.error("Create group failed:", err);
    }
  };

  const toggleSelectUser = (userId) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  // 🟢 Filter users in search
  const filteredUsers = users.filter((u) =>
    u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // 🟢 Handler for opening the New Chat Modal
  const handleOpenNewChat = () => {
    fetchUsers(); // Refresh the list of all users
    setSearchQuery(""); // Clear search
    setShowNewChatModal(true);
  };

  return (
    <div className="w-1/4 bg-gray-50 border-r flex flex-col relative">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-green-600 text-white">
        <h2 className="font-bold text-lg">Chats</h2>
        <div className="flex gap-3">
          <button
            // 🌟 Use the new handler 🌟
            onClick={handleOpenNewChat}
            title="New Chat"
            className="hover:scale-105 transition-transform"
          >
            <PlusCircle size={22} />
          </button>
          <button
            onClick={() => {
              fetchUsers();
              setShowGroupModal(true);
            }}
            title="Create Group"
            className="hover:scale-105 transition-transform"
          >
            <Users2 size={22} />
          </button>
        </div>
      </div>

      {/* Existing Chats */}
      <div className="flex-1 overflow-y-auto">
        {chats.length > 0 ? (
          chats.map((chat) => {
            const chatUser = chat.isGroup
              ? null
              : chat.users.find((u) => u._id !== user._id);

            const chatName = chat.isGroup
              ? chat.chatName
              : chatUser?.username || "Unknown User";

            const lastMsgSender = chat.latestMessage?.sender?.username;
            const lastMsgContent = chat.latestMessage?.content;
            const lastMsg = lastMsgContent
              ? `${chat.isGroup && lastMsgSender ? lastMsgSender + ": " : ""}${lastMsgContent}`
              : "";

            const isOnline = chatUser && onlineUsers[chatUser._id];

            return (
              <div
                key={chat._id}
                onClick={() => openExistingChat(chat)}
                className="p-3 cursor-pointer hover:bg-green-100 border-b transition-all flex items-center gap-3"
              >
                {/* 🌟 AVATAR/ICON AREA 🌟 */}
                <div className="w-10 h-10 rounded-full bg-green-300 text-green-800 flex items-center justify-center font-bold relative flex-shrink-0">
                  {chat.isGroup ? (
                    <Users2 size={20} /> // Group Icon
                  ) : (
                    chatUser?.username?.charAt(0).toUpperCase() // User Initial
                  )}
                  {/* Online Status Dot for Private Chats */}
                  {!chat.isGroup && (
                    <Circle
                      size={10}
                      className={`absolute bottom-0 right-0 border-2 border-gray-50 rounded-full ${
                        isOnline ? "text-green-500 fill-green-500" : "text-gray-400 fill-gray-400"
                      }`}
                    />
                  )}
                </div>

                {/* Chat Details */}
                <div className="flex flex-col flex-1 min-w-0">
                  <p className="font-semibold text-sm text-gray-800 truncate">{chatName}</p>
                  <p className="text-xs text-gray-500 truncate">{lastMsg}</p>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center text-gray-400 mt-8">No chats yet — start one!</div>
        )}
      </div>

      {/* 🟢 NEW CHAT Modal */}
      {showNewChatModal && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-96 p-5">
            {/* Header */}
            <div className="flex justify-between items-center border-b pb-3 mb-3">
              <h3 className="font-semibold text-lg">Start New Chat</h3>
              <button
                onClick={() => setShowNewChatModal(false)}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                ✕
              </button>
            </div>

            {/* Search Bar */}
            <div className="flex items-center border rounded mb-3 px-2">
              <Search size={16} className="text-gray-400" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full p-2 text-sm focus:outline-none"
              />
            </div>

            {/* User List */}
            <div className="max-h-80 overflow-y-auto border rounded p-2">
              {filteredUsers.length > 0 ? (
                filteredUsers.map((u) => (
                  <div
                    key={u._id}
                    // 🌟 Click initiates the chat 🌟
                    onClick={() => accessChat(u._id)}
                    className={`flex items-center gap-3 p-2 cursor-pointer text-sm border-b transition-all hover:bg-gray-100`}
                  >
                    {/* Avatar/Initial */}
                    <div className="w-8 h-8 rounded-full bg-blue-300 text-blue-800 flex items-center justify-center font-bold text-xs flex-shrink-0">
                      {u.username?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium">{u.username}</p>
                      <span className="block text-xs text-gray-400">{u.email}</span>
                    </div>
                    {/* Online Status */}
                    <div className="ml-auto flex items-center">
                      <Circle
                        size={10}
                        className={onlineUsers[u._id] ? "text-green-500 fill-green-500" : "text-gray-400 fill-gray-400"}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-400 text-sm py-4">No other users logged in.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 🟢 Group Creation Modal (remains unchanged) */}
      {showGroupModal && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-96 p-5">
            {/* Header */}
            <div className="flex justify-between items-center border-b pb-3 mb-3">
              <h3 className="font-semibold text-lg">Create Group</h3>
              <button
                onClick={() => setShowGroupModal(false)}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                ✕
              </button>
            </div>

            {/* Group Name */}
            <input
              type="text"
              placeholder="Enter group name..."
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="w-full border p-2 rounded mb-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />

            {/* Search Bar */}
            <div className="flex items-center border rounded mb-3 px-2">
              <Search size={16} className="text-gray-400" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full p-2 text-sm focus:outline-none"
              />
            </div>

            {/* User List */}
            <div className="max-h-56 overflow-y-auto border rounded p-2 mb-3">
              {filteredUsers.length > 0 ? (
                filteredUsers.map((u) => (
                  <div
                    key={u._id}
                    onClick={() => toggleSelectUser(u._id)}
                    className={`flex items-center justify-between p-2 cursor-pointer text-sm border-b transition-all ${
                      selectedUsers.includes(u._id)
                        ? "bg-green-100 font-medium"
                        : "hover:bg-gray-100"
                    }`}
                  >
                    <div>
                      <p>{u.username}</p>
                      <span className="block text-xs text-gray-400">{u.email}</span>
                    </div>
                    {selectedUsers.includes(u._id) && (
                      <span className="text-green-600 font-bold text-lg">✔</span>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-400 text-sm">No users found</p>
              )}
            </div>

            {/* Selected Members */}
            {selectedUsers.length > 0 && (
              <div className="mb-3">
                <h4 className="text-sm font-semibold mb-1">Selected Members:</h4>
                <div className="flex flex-wrap gap-2">
                  {users
                    .filter((u) => selectedUsers.includes(u._id))
                    .map((u) => (
                      <span
                        key={u._id}
                        className="bg-green-200 text-green-800 text-xs px-2 py-1 rounded-full flex items-center gap-1"
                      >
                        {u.username}
                        <button
                          onClick={() => toggleSelectUser(u._id)}
                          className="text-red-500 hover:text-red-700 font-bold ml-1"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                </div>
              </div>
            )}

            {/* Create Button */}
            <button
              onClick={handleCreateGroup}
              className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-all"
            >
              Create Group
            </button>
          </div>
        </div>
      )}
    </div>
  );
}