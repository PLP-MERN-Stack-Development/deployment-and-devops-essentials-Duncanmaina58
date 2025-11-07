// // src/components/ChatWindow.jsx
// import { useEffect, useState } from "react";
// import axios from "axios";

// export default function ChatWindow({ currentUser, selectedChat }) {
//   const [messages, setMessages] = useState([]);
//   const [newMessage, setNewMessage] = useState("");

//   useEffect(() => {
//     if (!selectedChat?._id) return;

//     const fetchMessages = async () => {
//       try {
//         const { data } = await axios.get(
//           `http://localhost:5000/api/messages/${selectedChat._id}`,
//           {
//             headers: { Authorization: `Bearer ${currentUser.token}` },
//           }
//         );
//         setMessages(data);
//       } catch (err) {
//         console.error("Error loading messages:", err);
//       }
//     };

//     fetchMessages();
//   }, [selectedChat, currentUser]);

//   const sendMessage = async (e) => {
//     e.preventDefault();
//     if (!newMessage.trim()) return;

//     try {
//       const { data } = await axios.post(
//         "http://localhost:5000/api/messages",
//         { chatId: selectedChat._id, content: newMessage },
//         { headers: { Authorization: `Bearer ${currentUser.token}` } }
//       );
//       setMessages([...messages, data]);
//       setNewMessage("");
//     } catch (err) {
//       console.error("Error sending message:", err);
//     }
//   };

//   if (!selectedChat)
//     return (
//       <div className="flex-1 flex items-center justify-center text-gray-500">
//         Select a chat to start messaging
//       </div>
//     );

//   return (
//     <div className="flex-1 flex flex-col">
//       <div className="p-4 bg-gray-200 font-semibold border-b">
//         {selectedChat.chatName || "Private Chat"}
//       </div>

//       <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-gray-50">
//         {messages.map((msg) => (
//           <div
//             key={msg._id}
//             className={`p-2 rounded-lg max-w-xs ${
//               msg.sender._id === currentUser._id
//                 ? "bg-blue-500 text-white ml-auto"
//                 : "bg-gray-300"
//             }`}
//           >
//             {msg.content}
//           </div>
//         ))}
//       </div>

//       <form onSubmit={sendMessage} className="p-4 border-t flex space-x-2">
//         <input
//           type="text"
//           value={newMessage}
//           onChange={(e) => setNewMessage(e.target.value)}
//           placeholder="Type a message..."
//           className="flex-1 border rounded-full px-4 py-2"
//         />
//         <button
//           type="submit"
//           className="bg-blue-500 text-white rounded-full px-4 py-2"
//         >
//           Send
//         </button>
//       </form>
//     </div>
//   );
// }
