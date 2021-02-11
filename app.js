const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const RoomService = require('./services/room');
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

  const emitNewRoster = () =>
    io.sockets.emit('fromApi.update.roster', service.getRoster());

  const emitNewWord = () => {
    service.shufflePassword();

    io.sockets
      .to(service.hintGiverRoom)
      .emit('fromApi.send.word', service.password);
  };

  const startRound = () => {
    console.log('Starting Round!');
    io.sockets.emit('fromApi.start.round', service.roomId);

    setTimeout(emitNewWord, 1000);
  };

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

  socket.on('fromClient.team.scored', (payload) => {
    service.incrementScore(payload);
    service.incrementRound();
    io.sockets.emit('fromApi.end.round', true);

    emitNewRoster();
  });

  socket.on('fromClient.start.round', () => {
    startRound();
  });

  socket.on('fromClient.next.turn', () => {
    const currTeamTurn = service.skipTurn();

    io.sockets.emit('fromApi.active.team', currTeamTurn);
  });

  socket.on('fromClient.start.game', () => {
    console.log('Started a game!');
    io.sockets.emit('fromApi.start.game', service.roomId);
    startRound();
  });

  socket.on('fromClient.shuffle.word', () => {
    emitNewWord();
  });

  socket.on('fromClient.in.room', () => {
    socket.emit('fromApi.in.room', service.hasRoom);
  });

  socket.on('disconnect', () => {
    service.removeClient();
  });
});

server.listen(port, () => console.log(`Listening on port ${port}`));
