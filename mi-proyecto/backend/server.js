const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bcrypt = require('bcrypt');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware (Las reglas del estadio)
app.use(cors()); // Permite que el frontend hable con el backend
app.use(express.json()); // Permite entender los datos que llegan en formato JSON

// ==========================================
// 1. CONEXIÓN A LA BASE DE DATOS (SQLite Local)
// ==========================================
const dbPath = path.resolve(__dirname, 'foro.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error("❌ Error al abrir las puertas del estadio:", err.message);
    } else {
        console.log("🏟️  Conectado a la base de datos SQLite (foro.db).");
    }
});

// Crear las tablas si es el primer partido
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE,
        password TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS mensajes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        texto TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES usuarios(id)
    )`);
});

// ==========================================
// 2. RUTAS DE LA API (Las jugadas)
// ==========================================

// Endpoint: REGISTRAR UN PEÑISTA NUEVO
app.post('/api/register', async (req, res) => {
    const { email, password } = req.body;
    
    // 🛡️ REGLA TÁCTICA: Validación en Backend (Lo que pide la auditoría)
    const regexEspecial = /[!@#$%^&*(),.?":{}|<>]/;

    if (!email || !password || password.length < 6) {
        return res.status(400).json({ error: "Ficha incompleta o clave muy corta (min. 6)." });
    }

    if (!regexEspecial.test(password)) {
        return res.status(400).json({ 
            error: "Seguridad débil: falta al menos un carácter especial (. , @ #)." 
        });
    }

    try {
        // 🛡️ SEGURIDAD: Hasheamos la contraseña antes de guardarla
        const hashedPassword = await bcrypt.hash(password, 10);

        // 🛡️ SEGURIDAD: Consulta parametrizada (los '?') contra SQL Injection
        const sql = `INSERT INTO usuarios (email, password) VALUES (?, ?)`;
        
        db.run(sql, [email, hashedPassword], function(err) {
            if (err) {
                // Si el email ya existe, SQLite tira un error de restricción UNIQUE
                if (err.message.includes('UNIQUE')) {
                    return res.status(409).json({ error: "Este peñista ya está registrado." });
                }
                return res.status(500).json({ error: "Error interno del estadio." });
            }
            res.status(201).json({ message: "¡Fichaje completado con éxito!", userId: this.lastID });
        });
    } catch (error) {
        res.status(500).json({ error: "Error grave en el servidor." });
    }
});

// ==========================================
// Endpoint: INICIAR SESIÓN (Login)
// ==========================================
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: "Faltan credenciales en la ficha." });
    }

    const sql = `SELECT * FROM usuarios WHERE email = ?`;
    db.get(sql, [email], async (err, usuario) => {
        if (err) return res.status(500).json({ error: "Error en el vestuario." });
        
        // Si no encuentra el email
        if (!usuario) {
            return res.status(401).json({ error: "Peñista no encontrado. ¿Te has registrado?" });
        }

        // 🛡️ SEGURIDAD: Comparamos la contraseña encriptada
        const match = await bcrypt.compare(password, usuario.password);
        if (!match) {
            return res.status(401).json({ error: "Clave táctica incorrecta." });
        }

        // Éxito: Devolvemos un token (simulado por ahora para que pase el front)
        res.status(200).json({ 
            message: "¡Bienvenido al estadio!", 
            token: "token_atleti_" + usuario.id 
        });
    });
});

// ==========================================
// Endpoint: OBTENER EL MURO (Mensajes)
// ==========================================
app.get('/api/mensajes', (req, res) => {
    // Unimos la tabla de mensajes con la de usuarios para tener el email
    const sql = `
        SELECT mensajes.texto, usuarios.email, mensajes.created_at 
        FROM mensajes 
        JOIN usuarios ON mensajes.user_id = usuarios.id 
        ORDER BY mensajes.created_at DESC 
        LIMIT 50
    `;
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ error: "Error al cargar el césped." });
        res.json(rows);
    });
});
// ==========================================
// Endpoint: PUBLICAR UN MENSAJE EN EL MURO
// ==========================================
app.post('/api/mensajes', (req, res) => {
    // 🛡️ REGLA TÁCTICA: En un proyecto real, aquí validaríamos el Token (JWT).
    // Para este Hackathon, simplificaremos asumiendo que el frontend envía el email del usuario.
    const { texto, email } = req.body;

    if (!texto || !email) {
        return res.status(400).json({ error: "Falta el mensaje o el autor." });
    }

    // 1. Buscamos el ID del usuario usando su email
    const sqlBuscarUsuario = `SELECT id FROM usuarios WHERE email = ?`;
    
    db.get(sqlBuscarUsuario, [email], (err, usuario) => {
        if (err || !usuario) {
            return res.status(401).json({ error: "Peñista no autorizado para hablar." });
        }

        // 2. Insertamos el mensaje en la tabla, vinculándolo al ID del usuario
        const sqlInsertarMensaje = `INSERT INTO mensajes (user_id, texto) VALUES (?, ?)`;
        
        db.run(sqlInsertarMensaje, [usuario.id, texto], function(err) {
            if (err) return res.status(500).json({ error: "El pase se ha ido a la grada (Error de servidor)." });
            
            res.status(201).json({ message: "¡Mensaje publicado en el estadio!" });
        });
    });
});
// ==========================================
// 3. ARRANCAR EL SERVIDOR
// ==========================================
app.listen(PORT, () => {
    console.log(`🚀 FutbolMania API corriendo en http://localhost:${PORT}`);
});