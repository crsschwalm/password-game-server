const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const RoomService = require('./services/roster');
const wordService = require('./services/words');
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
  const service = new RoomService(socket);
  service.addClient();

  const emitNewRoster = () =>
    io.sockets.emit('fromApi.update.roster', service.getRoster());

  socket.on('fromClient.create.room', (room) => {
    service.createRoom(room);
  });

  socket.on('fromClient.join.room', (room) => {
    service.joinRoom(room);

    emitNewRoster();
  });

  socket.on('fromClient.update.roster', (payload) => {
    service.setUser(payload);
    service.setRosterSpot(payload);

    emitNewRoster();
  });

  socket.on('fromClient.increment.score', (payload) => {
    service.incrementScore(payload);

    emitNewRoster();
  });

  socket.on('fromClient.increment.round', (payload) => {
    service.incrementRound(payload);

    emitNewRoster();
  });

  socket.on('fromClient.start.game', () => {
    console.log('Started a game!');
    io.sockets.emit('fromApi.start.game', service.roomId);

    const hintGiverRoom = service.hintGiverRoom();
    console.log('hintGiverRoom :>> ', hintGiverRoom);

    setTimeout(() => {
      io.sockets
        .to(hintGiverRoom)
        .emit('fromApi.send.word', wordService.pickRandomAny());
    }, 1000);
  });

  socket.on('fromClient.in.room', () => {
    socket.emit('fromApi.in.room', service.hasRoom());
  });

  socket.on('disconnect', () => {
    service.removeClient();
  });
});

server.listen(port, () => console.log(`Listening on port ${port}`));
