const wordService = require('./words');

const emptyRosterSpot = (index) => ({
  name: index === 0 ? 'Player 1' : 'Player 2',
  set: false,
});

const emptyTeam = (num) => ({
  name: `Team ${num}`,
  score: 0,
  players: [emptyRosterSpot(0), emptyRosterSpot(1)],
});

const emptyRoster = () => [emptyTeam(1), emptyTeam(2)];

const emptyRoom = (room) => ({
  id: room,
  playerCount: 0,
  roster: emptyRoster(),
  playerGivingHint: 0,
  teamGivingHint: 0,
  clients: {},
  password: wordService.pickRandomAny(),
});

const ROOMS = {};

class RoomService {
  constructor(socket) {
    this.socket = socket;

    this.user = {
      teamIndex: null,
      playerIndex: null,
      username: null,
      playerRoom: null,
    };

    this.roomId = null;
  }

  get password() {
    return ROOMS[this.roomId].password;
  }

  shufflePassword() {
    ROOMS[this.roomId].password = wordService.pickRandomAny();
  }

  get hintGiverRoom() {
    return ROOMS[this.roomId].playerGivingHint + '.' + this.roomId;
  }

  get hasRoom() {
    return !!this.roomId;
  }

  get whosTurn() {
    const teamIndex = ROOMS[this.roomId].playerGivingHint;
    const playerIndex = ROOMS[this.roomId].teamGivingHint;

    return {
      playerGivingHint:
        ROOMS[this.roomId].roster[teamIndex].players[playerIndex],
      playerGuessing:
        ROOMS[this.roomId].roster[teamIndex].players[(playerIndex + 1) % 2],
      teamIndex,
      playerIndex,
    };
  }

  nextTurn = () => {
    const currentTurn = ROOMS[this.roomId].teamGivingHint;

    ROOMS[this.roomId].teamGivingHint = (currentTurn + 1) % 2;
  };

  removeClient = () => {
    if (this.roomId) {
      ROOMS[this.roomId].playerCount--;

      if (ROOMS[this.roomId].playerCount < 1) {
        console.log('Deleting Room :>>', this.roomId);
        delete ROOMS[this.roomId];
      }
    }
  };

  createRoom = (room) => {
    if (ROOMS[room]) {
      return this.joinRoom(room);
    }

    console.log('Creating Room :>> ', room);
    ROOMS[room] = emptyRoom(room);

    this.joinRoom(room);
  };

  joinRoom = (room) => {
    this.roomId = room;

    if (!ROOMS[this.roomId]) {
      this.createRoom(room);
    }

    console.log('Joining room :>> ', this.roomId);

    ROOMS[this.roomId].clients[this.socket.id] = this.user;
    ROOMS[this.roomId].playerCount++;

    this.socket.join(this.roomId);
  };

  setUser = ({ username, teamIndex, playerIndex }) => {
    const playerRoom = playerIndex + '.' + this.roomId;

    console.log('playerRoom :>> ', playerRoom);
    this.socket.join(playerRoom);

    this.user = { username, teamIndex, playerIndex, playerRoom };

    ROOMS[this.roomId].clients[this.socket.id] = this.user;
  };

  setRosterSpot = ({ username, teamIndex, playerIndex }) => {
    const updatedRoster = ROOMS[this.roomId].roster.map((team, tIndex) => ({
      ...team,
      players: team.players.map((player, pIndex) => {
        if (player.name === username) {
          return emptyRosterSpot(pIndex);
        }

        if (teamIndex === tIndex && playerIndex === pIndex && !player.set) {
          return { name: username, set: true };
        }

        return player;
      }),
    }));

    ROOMS[this.roomId].roster = updatedRoster;
  };

  getRoster = () => ROOMS[this.roomId].roster;

  incrementRound = () => {
    const currentRound = ROOMS[this.roomId].playerGivingHint;

    ROOMS[this.roomId].playerGivingHint = (currentRound + 1) % 2;
  };

  incrementScore = (teamIndex) => {
    ROOMS[this.roomId].roster[teamIndex].score++;
  };
}

module.exports = RoomService;
