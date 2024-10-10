import express from "express";
import http from "http";
import { Server } from "socket.io";

const app = express();

// // Create HTTP server
// const server = http.createServer(app);

// Initialize Socket.IO
const io = new Server({
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Middleware to serve static files or handle JSON
app.use(express.json());

app.get("/", (req, res) => {
  console.log("smm");
  res.send("Hello, Socket.IO with Express!");
});

// -----------------------------------------------------------------------------------------------
// -----------------------------------------------------------------------------------------------
const email_to_socket = new Map();
const socket_to_email = new Map();

// Handle Socket.IO connections
io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);
  // when any user join roome this call
  socket.on("room:join", (data: { emailId: string; roomId: string }) => {
    const { emailId, roomId } = data;
    console.log("user joined room confirm:", emailId, roomId);

    socket.join(roomId);
    email_to_socket.set(emailId, socket.id);
    socket_to_email.set(socket.id, emailId);

    io.to(roomId).emit("user:joined", { emailId, id: socket.id });
    socket.join(roomId);
    io.to(socket.id).emit("room:join", data);
  });

  socket.on("call:user", (data: { to: string; offer: any }) => {
    const { to, offer } = data;
    console.log("call-user:", data);

    // user 1 pase thi aya-aya thi icomming call to user 2
    io.to(to).emit("incomming:call", { from: socket.id, offer });
  });

  socket.on(
    "call:accepted",
    (data: { to: string; answer: RTCSessionDescriptionInit }) => {
      const { to, answer } = data;
      console.log("call:accepted:", data);
      if (!answer || !answer.type || !answer.sdp) {
        console.error("Invalid answer received:", answer);
        throw new Error("Invalid answer");
      }
      io.to(to).emit("call:accepted", { from: socket.id, answer });
    }
  );

  socket.on(
    "peer:nego:needed",
    (data: { to: string; offer: RTCIceCandidate }) => {
      const { to, offer } = data;
      console.log("peer:nego:needed:", data);
      io.to(to).emit("peer:nego:needed", { from: socket.id, offer });
    }
  );

  socket.on(
    "peer:nego:done",
    (data: { to: string; answer: RTCIceCandidate }) => {
      const { to, answer } = data;
      io.to(to).emit("peer:nego:final", { from: socket.id, answer });
    }
  );
  socket.on("disconnect", () => {
    const emailId = socket_to_email.get(socket.id);
    console.log(`Client disconnected: ${socket.id} (${emailId})`);

    if (emailId) {
      email_to_socket.delete(emailId);
    }
    socket_to_email.delete(socket.id);
  });
});

// Start the server
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
io.listen(8001);
