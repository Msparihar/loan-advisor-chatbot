// src/index.ts
import express from "express";
import http from "http";
import { WebSocketServer, WebSocket } from "ws";

// --- Configuration ---
const app = express();
const server = http.createServer(app);

// Use a different port for the Node.js server to avoid conflict with Python
const NODE_PORT = 3001;
const PYTHON_BACKEND_WS_URL = "ws://localhost:8000/ws";

// Create a WebSocket server and attach it to the HTTP server
const wss = new WebSocketServer({ server });

console.log("Starting Node.js WebSocket Gateway...");

// --- WebSocket Gateway Logic ---

wss.on("connection", (clientWs: WebSocket) => {
  console.log("Frontend client connected to Node.js gateway.");

  // For each client that connects, create a corresponding connection to the Python backend
  const backendWs = new WebSocket(PYTHON_BACKEND_WS_URL);

  // --- Message Forwarding: Frontend -> Python Backend ---
  clientWs.on("message", (message) => {
    // When a message is received from the frontend client, forward it to the Python backend.
    // The message is already a buffer or string, so we can send it directly.
    if (backendWs.readyState === WebSocket.OPEN) {
      console.log("Forwarding message to Python backend ->");
      backendWs.send(message);
    }
  });

  // --- Message Forwarding: Python Backend -> Frontend ---
  backendWs.on("message", (message) => {
    // When a message is received from the Python backend, forward it to the frontend client.
    if (clientWs.readyState === WebSocket.OPEN) {
      console.log("<- Forwarding message from Python to frontend");
      clientWs.send(message);
    }
  });

  // --- Error and Close Handling ---

  clientWs.on("close", () => {
    console.log(
      "Frontend client disconnected. Closing connection to Python backend."
    );
    // If the frontend client disconnects, we must terminate the connection to the backend
    // to prevent orphaned connections on the Python server.
    backendWs.terminate();
  });

  backendWs.on("close", () => {
    console.log(
      "Python backend connection closed. Closing connection to frontend client."
    );
    // If the backend connection closes (e.g., Python server restarts),
    // close the connection to the frontend client.
    clientWs.terminate();
  });

  clientWs.on("error", (error) => {
    console.error("Error on frontend client WebSocket:", error);
    backendWs.terminate();
  });

  backendWs.on("error", (error) => {
    console.error("Error on Python backend WebSocket connection:", error);
    console.log("Could not connect to Python backend. Is it running?");
    clientWs.terminate();
  });
});

// --- Start the Server ---
server.listen(NODE_PORT, () => {
  console.log(
    `Node.js WebSocket Gateway is running on ws://localhost:${NODE_PORT}`
  );
});
