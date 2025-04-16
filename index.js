const express = require('express');
const app = express();
const http = require('http');
const cors = require('cors');

const { Server } = require('socket.io');

app.use(cors({
  origin: "https://messagingapp-purk.onrender.com/api", // Updated origin to match front-end port
  methods: ["GET", "POST"],
}));

const server = http.createServer(app);

const io = new Server(server, { 
    cors: { 
      origin: "https://messagingapp-purk.onrender.com/api", // Updated origin to match front-end port
      methods: ["GET", "POST"], 
  },
});

const activeUsersInRoom = {};
const messageHistory = {};

io.on('connection', (socket) => {
      socket.on('join_room', (data) => {
      const { room, userName } = data;
      socket.userName = userName;
      socket.room = room;
  
      if (!activeUsersInRoom[room]) {
        activeUsersInRoom[room] = new Set();
      }
      activeUsersInRoom[room].add(userName);
      socket.join(room);
      console.log(`user ${userName} joined room ${room}`);

      // Emit the updated list of active users to the room
      io.to(room).emit('active_users', Array.from(activeUsersInRoom[room]));

      // Emit all messages to the new user
      const allMessages = messageHistory[room] || [];
      socket.emit('all_messages', allMessages);
    });

    socket.on('send_message', (data) => {
      const { room, author, message, time } = data;
      if (!messageHistory[room]) {
        messageHistory[room] = [];
      }
      messageHistory[room].push(data);
      console.log(`Message received in room ${room}:`, data);
      io.to(room).emit('receive_message', data);
    });

    socket.on('disconnect', () => {
      const room = socket.room;
      const userName = socket.userName;
  
      if (room && userName) {
        // Remove the user from the active users set for the room
        if (activeUsersInRoom[room]) {
          activeUsersInRoom[room].delete(userName);
          console.log(`user ${userName} left room ${room}`);
  
          // Emit the updated list of active users to the room
          if (activeUsersInRoom[room].size > 0) {
            io.to(room).emit('active_users', Array.from(activeUsersInRoom[room]));
          } else {
            // If no users are left in the room, delete the room from the activeUsersInRoom object
            delete activeUsersInRoom[room];
          }
        }
      }
    });
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`listening on port: ${PORT}`);
});