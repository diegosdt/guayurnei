const { createClient } = require('@supabase/supabase-js');

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  console.error('FALTA configuración Supabase: define SUPABASE_URL y SUPABASE_ANON_KEY en .env');
  process.exit(1);
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

function makeUniqueCode(length = 6) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';

  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return code;
}

async function getUserByUsername(username) {
  const { data, error } = await supabase
    .from('users')
    .select('username, password, code')
    .eq('username', username)
    .single();

  if (error) {
    return { error };
  }

  return { user: data };
}

async function getUserByCode(code) {
  const { data, error } = await supabase
    .from('users')
    .select('username, code')
    .eq('code', code.toUpperCase())
    .single();

  if (error) {
    return { error };
  }

  return { user: data };
}

async function createUser(username, password) {
  const uniqueCode = makeUniqueCode();

  const { error } = await supabase
    .from('users')
    .insert([{ username, password, code: uniqueCode }]);

  if (error) {
    return { error };
  }

  return { user: { username, code: uniqueCode } };
}

module.exports = {
  getUserByUsername,
  getUserByCode,
  createUser,
};
