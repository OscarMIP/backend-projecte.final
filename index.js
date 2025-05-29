const jsonServer = require("json-server");
const server = jsonServer.create();
const fs = require('fs');
// Combinar db.json y characters.json
const db = JSON.parse(fs.readFileSync('db.json', 'utf-8'));
const characters = JSON.parse(fs.readFileSync('data/characters.json', 'utf-8'));
const router = jsonServer.router({
    ...db,
    characters: characters
});
const middlewares = jsonServer.defaults();

// Configurar puerto para coincidir con el esperado por el frontend
const PORT = process.env.PORT || 3002;

// Middleware para parsear el body
server.use(jsonServer.bodyParser);

// Middleware para CORS
const cors = require('cors');
server.use(cors());

// Middleware para manejar errores
server.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Error interno del servidor'
  });
});

// Middleware para logging
server.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});

// Rutas para cartas
server.get('/api/cards', (req, res) => {
    const characters = JSON.parse(fs.readFileSync('data/characters.json', 'utf-8'));
    res.json(characters);
});

server.get('/api/cards/:id', (req, res) => {
    const characters = JSON.parse(fs.readFileSync('data/characters.json', 'utf-8'));
    const character = characters.find(c => c.id === parseInt(req.params.id));
    if (character) {
        res.json(character);
    } else {
        res.status(404).json({ message: 'Carta no encontrada' });
    }
});

// Rutas personalizadas
server.post('/api/users/register', (req, res) => {
  const db = router.db;
  const { username, email, password } = req.body;

  // Verificar si el usuario ya existe
  const existingUser = db.get('usuarios')
    .find({ correo: email })
    .value();

  if (existingUser) {
    return res.status(400).json({
      success: false,
      message: 'El correu ja existeix'
    });
  }

  // Crear nuevo usuario
  const newUser = {
    id: Date.now(),
    nombre: username,
    correo: email,
    password: password, // En producción, esto debería estar hasheado
    stats: {
      gamesPlayed: 0,
      gamesWon: 0
    }
  };

  // Guardar usuario
  db.get('usuarios')
    .push(newUser)
    .write();

  return res.json({
    success: true,
    message: 'Usuari registrat correctament'
  });
});

server.post('/api/users/login', (req, res) => {
  const db = router.db;
  const { email, password } = req.body;

  // Buscar usuario
  const user = db.get('usuarios')
    .find({ correo: email, password: password })
    .value();

  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Credencials incorrectes'
    });
  }

  return res.json({
    success: true,
    user: {
      id: user.id,
      username: user.nombre,
      email: user.correo,
      stats: user.stats
    }
  });
});

server.post('/api/users/:id/stats', (req, res) => {
  const db = router.db;
  const { id } = req.params;
  const { won } = req.body;

  // Buscar usuario
  const user = db.get('usuarios')
    .find({ id: parseInt(id) })
    .value();

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'Usuari no trobat'
    });
  }

  // Actualizar estadísticas
  user.stats = user.stats || { gamesPlayed: 0, gamesWon: 0 };
  user.stats.gamesPlayed++;
  if (won) user.stats.gamesWon++;

  // Guardar cambios
  db.get('usuarios')
    .find({ id: parseInt(id) })
    .assign({ stats: user.stats })
    .write();

  return res.json({
    success: true,
    stats: user.stats
  });
});

// Middleware por defecto
server.use(middlewares);

// Router principal y reescritura de rutas
server.use('/api', (req, res, next) => {
    // Si la ruta no es una de las personalizadas, reescribir /api/users a /usuarios
    if (!req.url.match(/\/(register|login|stats)$/)) {
        req.url = req.url.replace('/users', '/usuarios');
    }
    next();
}, router);

server.listen(PORT, () => {
  console.log(`Backend server is running on http://localhost:${PORT}`);
});