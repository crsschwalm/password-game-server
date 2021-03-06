const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const RoomService = require('./services/room');
const routes = require('./routes');

const port = process.env.PORT || 4001;

const app = express().use(cors()).use(routes);
const server = http.createServer(app);

const urlWhitelist = [
  process.env.CLIENT_URL,
  'http://localhost:3000',
  'http://192.168.1.40:3000',
  'http://127.0.0.1:3000/',
];

const io = socketIo(server, {
  cors: {
    origin: (origin, callback) => {
      if (urlWhitelist.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

const emitNewRoster = (service) =>
  io.sockets
    .to(service.roomId)
    .emit('fromApi.update.roster', service.getRoster());

const emitNewWord = (service) => {
  service.shufflePassword();

  io.sockets
    .to(service.hintGiverRoom)
    .emit('fromApi.send.word', service.password);
};

const startRound = (service) => {
  io.sockets.to(service.roomId).emit('fromApi.start.round', service.roomId);

  emitNewWord(service);

  service.startTimer((time) =>
    io.sockets.to(service.roomId).emit('fromApi.timer', time)
  );
};

const emitWhosTurn = (service) => {
  console.log('Current Turn :>> ', service.whosTurn);
  io.sockets.to(service.roomId).emit('fromApi.whos.turn', service.whosTurn);
};

io.on('connection', (socket) => {
  const service = new RoomService(socket);

  socket.on('fromClient.create.room', service.createRoom);

  socket.on('fromClient.join.room', (payload) => {
    service.joinRoom(payload);

    emitNewRoster(service);
  });

  socket.on('fromClient.update.user', service.setUser);

  socket.on('fromClient.update.roster', (payload) => {
    service.setUser(payload);
    service.setRosterSpot(payload);

    emitNewRoster(service);
  });

  socket.on('fromClient.team.scored', (payload) => {
    service.incrementScore(payload);
    service.incrementRound();
    io.sockets.to(service.roomId).emit('fromApi.end.round', true);

    emitNewRoster(service);
  });

  socket.on('fromClient.start.round', () => {
    startRound(service);

    emitWhosTurn(service);
  });

  socket.on('fromClient.end.round', () => {
    io.sockets.to(service.roomId).emit('fromApi.start.round', service.roomId);
  });

  socket.on('fromClient.next.turn', () => {
    service.nextTurn();

    emitWhosTurn(service);
  });

  socket.on('fromClient.start.game', () => {
    console.log('Started a game!');
    startRound(service);
    io.sockets.to(service.roomId).emit('fromApi.start.game', service.roomId);
  });

  socket.on('fromClient.shuffle.word', () => {
    emitWhosTurn(service);
    emitNewWord(service);
  });

  socket.on('fromClient.in.room', () => {
    socket.emit('fromApi.in.room', service.hasRoom);
  });

  socket.on('disconnect', service.removeClient);
});

server.listen(port, () => console.log(`Listening on port ${port}`));
