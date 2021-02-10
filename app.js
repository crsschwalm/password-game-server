const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const routes = require('./routes');

const port = process.env.PORT || 4001;

const app = express().use(cors()).use(routes);

const server = http.createServer(app);

const io = socketIo(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

io.on('connection', (socket) => {
  console.log('New client connected');

  // socket.on('fromClient.join.room', (room) => {
  //   console.log('Joined Room: ', room);
  //   socket.join(room);
  // });

  socket.on('fromClient.update.roster', (roster) => {
    io.sockets.emit('fromApi.update.roster', roster);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

server.listen(port, () => console.log(`Listening on port ${port}`));
