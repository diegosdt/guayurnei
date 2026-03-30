var express = require('express');
var router = express.Router();

const authController = require('../controllers/authController');
const gameController = require('../controllers/gameController');
const userModel = require('../models/userModel');
const roomModel = require('../models/roomModel');

router.get('/', gameController.showHome);

router.get('/login', authController.showLogin);
router.post('/login', authController.postLogin);

router.get('/register', authController.showRegister);
router.post('/register', authController.postRegister);

router.post('/join', async function(req, res) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: 'No autenticado' });
  }

  const { code } = req.body;
  if (!code) {
    return res.status(400).json({ error: 'Código requerido' });
  }

  const { user, error } = await userModel.getUserByCode(code);
  if (error || !user) {
    return res.status(404).json({ error: 'Código no encontrado' });
  }

  if (user.username === req.session.user) {
    return res.status(400).json({ error: 'No puedes conectar contigo mismo' });
  }

  const room = roomModel.createOrGetRoom(req.session.user, user.username);
  req.session.roomId = room.id;

  res.json({ username: user.username, room });
});

router.post('/room/word', function(req, res) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: 'No autenticado' });
  }

  const room = roomModel.getRoomForUser(req.session.user);
  if (!room) {
    return res.status(400).json({ error: 'No estás en una sesión con amigo' });
  }

  if (room.setter !== req.session.user) {
    return res.status(403).json({ error: 'No es tu turno para asignar palabra' });
  }

  const { word, hint } = req.body;
  if (!word || !hint) {
    return res.status(400).json({ error: 'Debes enviar palabra y pista' });
  }

  const cleaned = word.trim().toUpperCase();
  if (!/^[A-ZÑ]+$/.test(cleaned)) {
    return res.status(400).json({ error: 'Palabra inválida, solo letras A-Zñ' });
  }

  room.currentWord = cleaned;
  room.currentHint = hint.trim();
  room.stage = 'guessing';
  room.turnCompleted = false;
  room.guessedLetters = [];
  room.wrongGuesses = 0;

  res.json({ message: 'Palabra guardada. La otra persona puede adivinar', room });
});

router.post('/room/guess', function(req, res) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: 'No autenticado' });
  }

  const room = roomModel.getRoomForUser(req.session.user);
  if (!room) {
    return res.status(400).json({ error: 'No estás en una sesión con amigo' });
  }

  if (room.stage !== 'guessing') {
    return res.status(400).json({ error: 'No hay ronda activa para adivinar' });
  }

  if (room.guesser !== req.session.user) {
    return res.status(403).json({ error: 'No eres el jugador que adivina esta ronda' });
  }

  const { letter } = req.body;
  if (!letter || typeof letter !== 'string' || !/^[A-ZÑ]$/.test(letter.toUpperCase())) {
    return res.status(400).json({ error: 'Letra inválida' });
  }

  const normalized = letter.toUpperCase();

  room.guessedLetters = room.guessedLetters || [];
  if (room.guessedLetters.includes(normalized)) {
    return res.status(200).json({ message: 'Letra ya usada', room });
  }

  room.guessedLetters.push(normalized);

  if (!room.currentWord.includes(normalized)) {
    room.wrongGuesses = (room.wrongGuesses || 0) + 1;
  }

  const wordLetters = Array.from(new Set(room.currentWord.split('')));
  const guessedCorrect = room.guessedLetters.filter(l => room.currentWord.includes(l));
  const hasWon = wordLetters.every(char => guessedCorrect.includes(char));
  const hasLost = (room.wrongGuesses || 0) >= 6;

  let resultMessage = '';

  if (hasWon || hasLost) {
    const revealedWord = room.currentWord;
    const wrapped = roomModel.swapRoles(room);
    resultMessage = hasWon
      ? '¡Ganaste! Ahora cambias a setter.'
      : `Fallaste y perdiste. La palabra era ${revealedWord}. Ahora cambias a setter.`;
    return res.json({
      message: resultMessage,
      room: wrapped,
      gameOver: true,
      win: hasWon,
      revealedWord,
    });
  }

  res.json({ message: 'Letra guardada', room, gameOver: false });
});

router.post('/room/roundend', function(req, res) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: 'No autenticado' });
  }

  const room = roomModel.getRoomForUser(req.session.user);
  if (!room) {
    return res.status(400).json({ error: 'No estás en una sesión con amigo' });
  }

  if (room.guesser !== req.session.user) {
    return res.status(403).json({ error: 'Solo quien adivina puede terminar la ronda' });
  }

  room.turnCompleted = true;
  // hacemos swap inmediato para iniciar nueva fase de setup
  const nextRoom = roomModel.swapRoles(room);

  res.json({ message: 'Ronda finalizada. Roles intercambiados.', room: nextRoom });
});

router.post('/room/swap', function(req, res) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: 'No autenticado' });
  }

  const room = roomModel.getRoomForUser(req.session.user);
  if (!room) {
    return res.status(400).json({ error: 'No estás en una sesión con amigo' });
  }

  if (!room.turnCompleted || room.stage !== 'round_complete') {
    return res.status(400).json({ error: 'No hay ronda finalizada pendiente' });
  }

  const oldSetter = room.setter;
  room.setter = room.guesser;
  room.guesser = oldSetter;
  room.stage = 'setup';
  room.turnCompleted = false;
  room.currentWord = null;
  room.currentHint = null;

  res.json({ message: 'Roles intercambiados. Ahora pon la palabra y pista.', room });
});

router.post('/room/disconnect', function(req, res) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: 'No autenticado' });
  }

  const room = roomModel.getRoomForUser(req.session.user);
  if (!room) {
    return res.status(400).json({ error: 'No estás en una sesión con amigo' });
  }

  const removed = roomModel.removeRoom(room.id);
  req.session.roomId = null;
  res.json({ message: 'Conexión finalizada', removed });
});

router.get('/room/status', function(req, res) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: 'No autenticado' });
  }
  const room = roomModel.getRoomForUser(req.session.user);
  if (!room) {
    return res.status(404).json({ error: 'Sin sala' });
  }
  res.json({ room });
});

router.get('/logout', authController.logout);

module.exports = router;
