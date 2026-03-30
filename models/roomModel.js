const rooms = {};

function roomKey(a, b) {
  return [a, b].sort().join(':');
}

function getRoomForUser(username) {
  const key = Object.keys(rooms).find(k => {
    const r = rooms[k];
    return r.playerA === username || r.playerB === username;
  });
  return key ? rooms[key] : null;
}

function createOrGetRoom(userA, userB) {
  const key = roomKey(userA, userB);
  if (!rooms[key]) {
    rooms[key] = {
      id: key,
      playerA: userA,
      playerB: userB,
      setter: userA,
      guesser: userB,
      stage: 'setup',
      currentWord: null,
      currentHint: null,
      guessedLetters: [],
      wrongGuesses: 0,
      turnCompleted: false,
    };
  }
  return rooms[key];
}

function updateRoom(room) {
  if (!room || !room.id) return null;
  rooms[room.id] = room;
  return room;
}

function swapRoles(room) {
  if (!room) return null;
  const oldSetter = room.setter;
  room.setter = room.guesser;
  room.guesser = oldSetter;
  room.stage = 'setup';
  room.currentWord = null;
  room.currentHint = null;
  room.turnCompleted = false;
  rooms[room.id] = room;
  return room;
}

function removeRoom(roomId) {
  if (!roomId || !rooms[roomId]) return false;
  delete rooms[roomId];
  return true;
}

module.exports = {
  getRoomForUser,
  createOrGetRoom,
  updateRoom,
  swapRoles,
  removeRoom,
};