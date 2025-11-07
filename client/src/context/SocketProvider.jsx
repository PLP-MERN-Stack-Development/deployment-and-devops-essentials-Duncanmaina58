import React, { createContext, useContext, useEffect, useState } from "react";
import { socket } from "../socket/socket";

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export function SocketProvider({ children }) {
  const [username, setUsername] = useState(null);
  const [users, setUsers] = useState([]);
  useEffect(() => {
    socket.on("connect", () => console.log("connected", socket.id));
    socket.on("presence:update", (list) => setUsers(list));
    socket.on("disconnect", () => console.log("disconnected"));
    return () => {
      socket.off("connect");
      socket.off("presence:update");
      socket.off("disconnect");
    };
  }, []);

  const login = (name) => {
    setUsername(name);
    socket.connect();
    socket.emit("auth", { username: name });
  };

  return <SocketContext.Provider value={{ socket, username, login, users }}>{children}</SocketContext.Provider>;
}
