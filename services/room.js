const wordService = require('./words');

const emptyRosterSpot = (index) => ({
  username: index === 0 ? 'Player 1' : 'Player 2',
  set: false,
});

const emptyTeam = (num) => ({
  name: `Team ${num}`,
  score: 0,
  players: [emptyRosterSpot(0), emptyRosterSpot(1)],
});

const emptyRoster = () => [emptyTeam(1), emptyTeam(2)];

const emptyRoom = (roomId) => ({
  id: roomId,
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
      id: null,
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
    if (!!this.roomId) {
      ROOMS[this.roomId].playerCount--;

      if (ROOMS[this.roomId].playerCount < 1) {
        console.log('Deleting Room :>>', this.roomId);
        delete ROOMS[this.roomId];
      }
    }
  };

  createRoom = (roomId) => {
    if (ROOMS[roomId]) {
      return this.joinRoom({ roomId, userId: this.user.id });
    }

    console.log('Creating Room :>> ', roomId);
    ROOMS[roomId] = emptyRoom(roomId);

    this.joinRoom({ roomId, userId: this.user.id });
  };

  joinRoom = ({ roomId, userId }) => {
    this.roomId = roomId;
    if (userId) this.user.id = userId;

    if (!ROOMS[this.roomId]) {
      return this.createRoom(this.roomId);
    }

    const foundUser = ROOMS[this.roomId]?.clients?.[userId];

    if (foundUser) {
      this.setUser(foundUser);
    } else {
      this.setUser(this.user);
    }

    console.log('Joining room :>> ', this.roomId);
    ROOMS[this.roomId].playerCount++;

    this.socket.join(this.roomId);
  };

  setUser = (payload) => {
    const playerRoom = payload.playerIndex + '.' + this.roomId;

    this.socket.join(playerRoom);

    this.user = { ...this.user, ...payload, playerRoom };

    ROOMS[this.roomId].clients[this.user.id] = this.user;

    this.socket.emit('fromApi.update.user', this.user);
  };

  setRosterSpot = ({ username, teamIndex, playerIndex }) => {
    const updatedRoster = ROOMS[this.roomId].roster.map((team, tIndex) => ({
      ...team,
      players: team.players.map((player, pIndex) => {
        if (player.username === username) {
          return emptyRosterSpot(pIndex);
        }

        if (teamIndex === tIndex && playerIndex === pIndex && !player.set) {
          return { username, set: true };
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
