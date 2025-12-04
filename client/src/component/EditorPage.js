import React, { useEffect, useRef, useState } from "react";
import Client from "./Client";
import Editor from "./Editor";
import { initSocket } from "../socket";
import {
  useNavigate,
  useLocation,
  useParams,
  Navigate,
} from "react-router-dom";

import { toast } from "react-hot-toast";

function EditorPage() {
  const [clients, setClient] = useState([]);
  const socketRef = useRef(null);
  const codeRef = useRef(null);
  const location = useLocation();
  const { roomId } = useParams();
  const navigate = useNavigate();
  
  useEffect(() => {
    const init = async () => {
      const handleError = (e) => {
        console.log("socket error=>", e);
        toast.error("Socket connection failed, Try again later");
        navigate("/");
      };
      socketRef.current = await initSocket();
      socketRef.current.on("connect_error", (err) => handleError(err));
      socketRef.current.on("connect_failed", (err) => handleError(err));

      socketRef.current.on("clients-list", (clients) => {
        console.log("clients-list received:", clients);
        setClient(clients);
        socketRef.current.emit("sync-code", {});
      });

      socketRef.current.emit("join", {
        roomId,
        username: location.state?.username,
      });

      socketRef.current.on("joined", ({ clients, username, sockeId }) => {
        if (username !== location.state?.username) {
          toast.success(`${username} joined`);
        }
        setClient(clients);
        socketRef.current.emit("sync-code" , {
          code: codeRef.current,
          sockeId,
        });
      });
      // disconnected
      socketRef.current.on("disconnected", ({ socketId, username }) => {
        toast.success(`${username} leave`);
        setClient((prev) => {
          return prev.filter((client) => client.sockeId != socketId);
        });
      });
    };

    init();

    return () => {
      socketRef.current.disconnect();
      socketRef.current.off("joined");
      socketRef.current.off("disconnected");
    };
  }, []);

  if (!location.state) {
    return <Navigate to="/" />;
  }




  const copyRoomId = async () =>{
    try {
      await navigator.clipboard.writeText(roomId);
      console.log(roomId);
      toast.success("Room ID is copied");
    }catch(error){
      toast.error("Unable to copy Room ID");
    }
  };

  const leaveRoom = async () =>{
    navigate("/");
  };

  return (
    <div class="container-fluid vh-100">
      <div class="row h-100">
        <div
          class="col-md-2 bg-dark text-light d-flex flex-column h-100"
          style={{ boxShadow: "2px 0px 4px rgba(0,0,0,0.1)" }}
        >
          <img
            src="/images/codepaglu.png"
            alt="codepaglu.png"
            style={{ maxWidth: "150px", marginTop: "-10px" }}
          />
          <hr style={{ marginTop: "1rem" }} />

         
          {/*client list container */}
          <div class="d-flex flex-column overflow-auto">
            {clients.map((client) => (
              <Client key={client.socketId} username={client.username} />
            ))}
          </div>
          {/** Button */}
          <div class="mt-auto">
            <hr />
            <button onClick={copyRoomId} className="btn btn-success" type="button">Copy Room Id</button>
            <button onClick={leaveRoom} className="btn btn-danger mt-2 mb-2 px-3 btn-block">
              Leave Room
            </button>
          </div>
        </div>
        {/** Editor */}
        <div class="col-md-10 text-light d-flex flex-column h-100">
          <Editor
            socketRef={socketRef}
            roomId={roomId}
            onCodeChange={(code) => (codeRef.current = code)}
          />
        </div>
      </div>
    </div>
  );
}

export default EditorPage;
