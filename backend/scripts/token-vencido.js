// Genera un JWT firmado con el secreto real pero ya vencido, para probar el manejo de sesiones expiradas.
// Uso: npm run token:vencido [idUsuario]
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const jwt = require('jsonwebtoken');
const { randomUUID } = require('crypto');

const ahora = Math.floor(Date.now() / 1000);
const token = jwt.sign(
  { sub: Number(process.argv[2] || 4), correo: 'carlos@eventia.test', rol: 'usuario', jti: randomUUID(), iat: ahora - 3600, exp: ahora - 60 },
  process.env.JWT_SECRET,
  { algorithm: 'HS256' },
);
console.log(token);
