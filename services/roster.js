const emptyRosterSpot = (index) => ({
  name: index === 0 ? 'Hint First' : 'Guess First',
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
});

const CLIENTS = {};
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

    this.addClient();
  }

  addClient = () => {
    console.log('New client connected', this.socket.id);
    CLIENTS[this.socket.id] = { socket: this.socket };
  };

  removeClient = () => {
    console.log('Client disconnected', this.socket.id);

    delete CLIENTS[this.socket.id];

    if (this.roomId) {
      ROOMS[this.roomId].playerCount--;

      if (ROOMS[this.roomId].playerCount < 1) {
        console.log('Last person left the room :>> ', this.roomId);
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
    if (!ROOMS[room]) {
      this.createRoom(room);
    }
    console.log('Joining Room :>> ', room);

    ROOMS[room].playerCount++;

    this.socket.join(room);
    this.roomId = room;
  };

  setUser = ({ username, teamIndex, playerIndex }) => {
    const playerRoom = playerIndex + '.' + this.roomId;
    this.socket.join(playerRoom);

    this.user = { username, teamIndex, playerIndex, playerRoom };
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

  hintGiverRoom = () => {
    return ROOMS[this.roomId].playerGivingHint + '.' + this.roomId;
  };

  hasRoom = () => !!this.roomId;
}

module.exports = RoomService;
