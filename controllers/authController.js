const userModel = require('../models/userModel');

function isAuthenticated(req) {
  return req.session && req.session.user;
}

async function showLogin(req, res) {
  if (isAuthenticated(req)) {
    return res.redirect('/');
  }
  res.render('login', { title: 'Iniciar sesión', error: null });
}

async function postLogin(req, res) {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.render('login', { title: 'Iniciar sesión', error: 'Completa los campos' });
  }

  const { user, error } = await userModel.getUserByUsername(username);
  if (error || !user || user.password !== password) {
    return res.render('login', { title: 'Iniciar sesión', error: 'Credenciales inválidas' });
  }

  req.session.user = user.username;
  req.session.userCode = user.code;
  res.redirect('/');
}

async function showRegister(req, res) {
  if (isAuthenticated(req)) {
    return res.redirect('/');
  }
  res.render('register', { title: 'Registro', error: null });
}

async function postRegister(req, res) {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.render('register', { title: 'Registro', error: 'Completa los campos' });
  }

  const { user: existing, error: existingError } = await userModel.getUserByUsername(username);
  if (existing) {
    return res.render('register', { title: 'Registro', error: 'Usuario ya existe' });
  }

  const { user, error } = await userModel.createUser(username, password);
  if (error) {
    return res.render('register', { title: 'Registro', error: 'No se pudo crear la cuenta (verifique Supabase).' });
  }

  req.session.user = user.username;
  req.session.userCode = user.code;
  res.redirect('/');
}

function logout(req, res) {
  req.session.destroy(() => {
    res.redirect('/login');
  });
}

module.exports = {
  showLogin,
  postLogin,
  showRegister,
  postRegister,
  logout,
  isAuthenticated,
};
