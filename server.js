const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const port = 3001;

app.use(cors());
app.use(bodyParser.json());

const dbConfig = {
    host: 'srv1247.hstgr.io',
    user: 'u475816193_Dropping',
    password: 'Dropping@1',
    database: 'u475816193_dbDropping',
    connectTimeout: 10000, // 10 segundos
    acquireTimeout: 10000, // 10 segundos
    connectionLimit: 10, // Límite de conexiones en el pool
    queueLimit: 0 // Sin límite de cola
};

const pool = mysql.createPool(dbConfig);

pool.getConnection((err, connection) => {
    if (err) {
        console.error('Error connecting to the database:', err);
        return;
    }
    if (connection) connection.release();
    console.log('Connected to the database');
});

app.use((req, res, next) => {
    req.db = pool;
    next();
});

pool.on('error', function (err) {
    console.error('Database error:', err);
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
        handleDisconnect();
    } else {
        throw err;
    }
});

function handleDisconnect() {
    pool.getConnection((err, connection) => {
        if (err) {
            console.error('Error when connecting to db:', err);
            setTimeout(handleDisconnect, 2000);
        }
        if (connection) connection.release();
        console.log('Reconnected to the database');
    });
}

const requiredFieldsMap = {
    cliente: ['Nombre', 'Municipio', 'Direccion', 'Celular', 'Correo', 'Contraseña', 'Estado'],
    empleado: ['Nombre', 'CURP', 'RFC', 'Direccion', 'Fecha_nac', 'Contraseña', 'Estado', 'Telefono'],
    administrativo: ['Nombre', 'ClaveUnica', 'Contraseña', 'Fecha_nac', 'RFC', 'CURP', 'Direccion', 'Comentarios', 'Estado'],
    tinaco: ['id_cliente', 'Litros', 'Nivel'],
    mantenimiento: ['id_Tinaco', 'Comentarios', 'Realizado', 'Fecha', 'Hora'],
    mensaje: ['id_cliente', 'Mensaje', 'Fecha', 'Hora']
};

function validateRequiredFields(entity, data) {
    const requiredFields = requiredFieldsMap[entity];

    if (!requiredFields) {
        return 'Entidad no válida';
    }

    for (const field of requiredFields) {
        if (!(field in data)) {
            return `${field} es obligatorio.`;
        }
    }
    return null;
}

// CRUD básico para cada entidad
Object.keys(requiredFieldsMap).forEach(entity => {
    // Create
    app.post(`/api/${entity}`, (req, res) => {
        const data = req.body;
        const validationError = validateRequiredFields(entity, data);
        if (validationError) {
            return res.status(400).send(validationError);
        }

        const columns = Object.keys(data).join(', ');
        const values = Object.values(data);
        const placeholders = values.map(() => '?').join(', ');
        const sql = `INSERT INTO ${entity.charAt(0).toUpperCase() + entity.slice(1)} (${columns}) VALUES (${placeholders})`;

        req.db.query(sql, values, (err, result) => {
            if (err) {
                console.error(`Error inserting into ${entity}:`, err);
                return res.status(500).send(`Error inserting into ${entity}: ` + err.message);
            }
            res.status(201).send(result);
        });
    });

    // Read all
    app.get(`/api/${entity}`, (req, res) => {
        const sql = `SELECT * FROM ${entity.charAt(0).toUpperCase() + entity.slice(1)}`;
        req.db.query(sql, (err, results) => {
            if (err) {
                console.error(`Error querying ${entity} table:`, err);
                return res.status(500).send(`Error querying ${entity} table: ` + err.message);
            }
            res.status(200).send(results);
        });
    });

    // Read by id
    app.get(`/api/${entity}/id/:id`, (req, res) => {
        const { id } = req.params;
        const sql = `SELECT * FROM ${entity.charAt(0).toUpperCase() + entity.slice(1)} WHERE id = ?`;
        req.db.query(sql, [id], (err, results) => {
            if (err) {
                console.error(`Error querying ${entity} by id ${id}:`, err);
                return res.status(500).send(`Error querying ${entity} by id ${id}: ` + err.message);
            }
            res.status(200).send(results);
        });
    });

    // Update by id
    app.put(`/api/${entity}/id/:id`, (req, res) => {
        const { id } = req.params;
        const data = req.body;

        // Log the received request
        console.log('Received PUT request:', { id, data });

        // Validate the Estado field
        if (!data.Estado || (data.Estado !== 'Activo' && data.Estado !== 'Inactivo')) {
            return res.status(400).send('El campo "Estado" es obligatorio y debe ser "Activo" o "Inactivo".');
        }

        const columns = Object.keys(data).map(key => `${key} = ?`).join(', ');
        const values = Object.values(data);
        values.push(id);
        const sql = `UPDATE ${entity.charAt(0).toUpperCase() + entity.slice(1)} SET ${columns} WHERE id = ?`;

        req.db.query(sql, values, (err, result) => {
            if (err) {
                console.error(`Error updating ${entity} with id ${id}:`, err);
                return res.status(500).send(`Error updating ${entity} with id ${id}: ` + err.message);
            }
            res.status(200).send(result);
        });
    });

    // Delete by id
    app.delete(`/api/${entity}/id/:id`, (req, res) => {
        const { id } = req.params;
        const sql = `DELETE FROM ${entity.charAt(0).toUpperCase() + entity.slice(1)} WHERE id = ?`;
        req.db.query(sql, [id], (err, result) => {
            if (err) {
                console.error(`Error deleting ${entity} with id ${id}:`, err);
                return res.status(500).send(`Error deleting ${entity} with id ${id}: ` + err.message);
            }
            res.status(200).send(result);
        });
    });
});

// Ruta de inicio de sesión
app.post('/Home', (req, res) => {
    const { nombre, claveUnica, contraseña } = req.body;

    // Validar los datos de entrada
    if (!nombre || !claveUnica || !contraseña) {
        return res.status(400).send('Nombre, ClaveUnica y Contraseña son obligatorios.');
    }

    const query = 'SELECT * FROM Administrativo WHERE Nombre = ? AND ClaveUnica = ? AND Contraseña = ?';

    req.db.query(query, [nombre, claveUnica, contraseña], (err, results) => {
        if (err) {
            console.error('Error querying the database:', err);
            return res.status(500).send('Error querying the database: ' + err.message);
        } else if (results.length > 0) {
            const userData = results[0]; // Obtener datos del primer administrativo encontrado
            console.log('User Data:', userData); // Agregar esto para verificar los datos
            res.status(200).send(userData); // Devolver datos del administrativo
        } else {
            res.status(401).send('Credenciales inválidas');
        }
    });
});

// Rutas específicas para obtener todos los empleados y clientes
app.get('/api/empleados', (req, res) => {
    const sql = 'SELECT * FROM Empleado';
    req.db.query(sql, (err, results) => {
        if (err) {
            console.error('Error querying empleado table:', err);
            return res.status(500).send('Error querying empleado table: ' + err.message);
        }
        res.status(200).send(results);
    });
});

app.get('/api/clientes', (req, res) => {
    const sql = 'SELECT * FROM Cliente';
    req.db.query(sql, (err, results) => {
        if (err) {
            console.error('Error querying cliente table:', err);
            return res.status(500).send('Error querying cliente table: ' + err.message);
        }
        res.status(200).send(results);
    });
});

// Rutas para los procedimientos almacenados

// Ruta para insertar un mensaje
app.post('/api/mensaje', (req, res) => {
    const { id_cliente, mensaje, fecha, hora } = req.body;

    const sql = 'CALL InsertarMensaje(?, ?, ?, ?)';
    req.db.query(sql, [id_cliente, mensaje, fecha, hora], (err, result) => {
        if (err) {
            console.error('Error calling InsertarMensaje:', err);
            return res.status(500).send('Error inserting message: ' + err.message);
        }
        res.status(201).send(result);
    });
});

// Ruta para obtener todos los mensajes
app.get('/api/mensajes', (req, res) => {
    const sql = 'CALL ObtenerMensajes()';
    req.db.query(sql, (err, results) => {
        if (err) {
            console.error('Error calling ObtenerMensajes:', err);
            return res.status(500).send('Error getting messages: ' + err.message);
        }
        res.status(200).send(results[0]);
    });
});

app.listen(port, () => {
    console.log(`API listening at http://localhost:${port}`);
});

// Ruta para obtener clientes con información de tinacos
app.get('/api/clientes-tinacos', (req, res) => {
    const sql = `
        SELECT
            c.id AS id_cliente,
            c.Nombre AS Nombre_Cliente,
            c.Celular,
            c.Correo,
            c.Municipio,
            c.Direccion AS Direccion_Cliente,
            GROUP_CONCAT(t.id ORDER BY t.id ASC) AS ids_tinacos,
            GROUP_CONCAT(t.Litros ORDER BY t.id ASC) AS capacidades_tinacos
        FROM
            Cliente c
        LEFT JOIN
            Tinaco t ON c.id = t.id_cliente
        GROUP BY
            c.id
        ORDER BY
            c.Nombre;
    `;
    req.db.query(sql, (err, results) => {
        if (err) {
            console.error('Error querying clientes with tinacos:', err);
            return res.status(500).send('Error querying clientes with tinacos: ' + err.message);
        }
        res.status(200).send(results);
    });
});

