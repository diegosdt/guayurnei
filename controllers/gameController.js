const userModel = require('../models/userModel');
const roomModel = require('../models/roomModel');

async function showHome(req, res) {
  if (!req.session || !req.session.user) {
    return res.redirect('/login');
  }

  const username = req.session.user;
  const { user } = await userModel.getUserByUsername(username);
  const room = roomModel.getRoomForUser(username);

  let roomData = null;
  if (room) {
    roomData = {
      id: room.id,
      playerA: room.playerA,
      playerB: room.playerB,
      setter: room.setter,
      guesser: room.guesser,
      stage: room.stage,
      currentWord: room.currentWord,
      currentHint: room.stage === 'guessing' ? room.currentHint : '',
      guessedLetters: room.guessedLetters || [],
      wrongGuesses: room.wrongGuesses || 0,
      userIsSetter: room.setter === username,
      userIsGuesser: room.guesser === username,
    };
  }

  res.render('index', {
    title: 'Ahorcado en pareja',
    user: username,
    userCode: user?.code || '---',
    message: null,
    roomData,
  });
}

module.exports = { showHome };
