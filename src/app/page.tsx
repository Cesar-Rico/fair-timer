"use client";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";

export default function ChaosTimer() {
  const [counter, setCounter] = useState<number | null>(null);
  const socket = useRef<WebSocket | null>(null);
  const [isStarted, setIsStarted] = useState<boolean>(false);
  const [inputTime, setInputTime] = useState<string | number>("");
  const [redBorder, setRedBorder] = useState<boolean>(false);
  const [wsStatus, setWsStatus] = useState<"connected" | "disconnected">("disconnected");

  useEffect(() => {
    let reconnectTimeout: NodeJS.Timeout;
    const connectWebSocket = () => {
      if (socket.current) return;
      socket.current = new WebSocket("ws://192.168.18.174:8080");

      socket.current.onopen = () => {
        console.log("WebSocket conectado");
        clearTimeout(reconnectTimeout);
        setWsStatus("connected");
      };
      socket.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        setCounter(data.value);
        setIsStarted(data.value !== 0);
      };

      socket.current.onclose = () => {
        console.log("WebSocket cerrado, intentando reconectar...");
        setWsStatus("disconnected");
        socket.current = null;
        reconnectTimeout = setTimeout(connectWebSocket, 5000);
      }
      socket.current.onerror = (error) => {
        console.error("WebSocket error:", error);
        socket.current?.close();
      };
    }
    connectWebSocket();
    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (socket.current) socket.current.close();
      socket.current = null;
    };
  }, []);

  const formatTime = useMemo(() => {
    if (counter === null || counter < 0) return "00:00";
    const minutes = Math.floor(counter / 60);
    const secs = counter % 60;
    console.log(`Formatting time: ${counter} seconds to ${minutes} minutes and ${secs} seconds`);
    return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }, [counter]);

  const sendAction = useCallback((action: string, message?: string | number) => {
    

    if(action === "start") {
      let number = Number(message);
      if (message === "" || isNaN(number) || number <= 0 || number > 1440) {
        // Show red border and shake animation
        setRedBorder(true)
        return;
      }
      setCounter(Number(message) * 60);
      setInputTime("");
      setIsStarted(true);
    }
    console.log(`Sending action: ${action}, message: ${message}`);
    socket.current?.send(JSON.stringify({ action, message }));
  }, [socket.current]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRedBorder(false);
    setInputTime(e.target.value);
  };
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-neutral-900 text-gray-200 p-6">
      <div className="absolute top-5 left-5 flex items-center gap-2">
        <span className={`w-4 h-4 rounded-full ${wsStatus === "connected" ? "bg-green-500" : "bg-red-500"}`}></span>
        <span>{wsStatus === "connected" ? "Connected" : "Disconnected"}</span>
      </div>
      <h1 className="text-3xl font-medium tracking-tight mb-4 text-[#164818] font-din">FairTimer</h1>
      {counter != null ? (
        <div className={`text-6xl font-mono transition-all duration-300 ${counter <= 10 ? "text-red-400" : "text-gray-200"}`}>
        {formatTime}
      </div>
      ) : (
        <div className="text-2xl font-mono text-gray-200">Loading...</div>
      )}
      <div className="mt-5 flex gap-3">
        <button className="px-5 py-2 border border-gray-600 rounded-md text-gray-300 hover:bg-gray-800 cursor-pointer" onClick={() => {sendAction("start", inputTime);}}>
          Start
        </button>
        <button className="px-5 py-2 border border-gray-600 rounded-md text-gray-300 hover:bg-gray-800 cursor-pointer" onClick={() => {sendAction("stop"); setIsStarted(false);}}>
          Reset
        </button>
      </div>
      {counter !== null && !isStarted && (
        <div className={`mt-3 flex transition-opacity duration-500 ${isStarted ? "opacity-0 scale-95" : "opacity-100 scale-100"}`}>
          <input
            type="number"
            placeholder="Minutes"
            className={`mt-5 px-5 py-2 border ${redBorder ? "border-red-500 animate-shake" : "border-gray-600"} rounded-md text-gray-300 bg-neutral-800 appearance-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
            onChange={handleInputChange}
            value={inputTime}
          />
        </div>
      )}
    </div>
  );
}
