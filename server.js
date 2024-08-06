const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const port = 3001;

app.use(cors());
app.use(bodyParser.json());

const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});

db.connect((err) => {
    if (err) {
        throw err;
    }
    console.log('MySQL Connected...');
});

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
        const sql = `INSERT INTO ${entity} (${columns}) VALUES (${placeholders})`;

        db.query(sql, values, (err, result) => {
            if (err) {
                console.error(`Error inserting into ${entity}:`, err);
                return res.status(500).send(`Error inserting into ${entity}: ` + err.message);
            }
            res.status(201).send(result);
        });
    });

    // Read all
    app.get(`/api/${entity}`, (req, res) => {
        const sql = `SELECT * FROM ${entity}`;
        db.query(sql, (err, results) => {
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
        const sql = `SELECT * FROM ${entity} WHERE id = ?`;
        db.query(sql, [id], (err, results) => {
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
        const sql = `UPDATE ${entity} SET ${columns} WHERE id = ?`;

        db.query(sql, values, (err, result) => {
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
        const sql = `DELETE FROM ${entity} WHERE id = ?`;
        db.query(sql, [id], (err, result) => {
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
    const query = 'SELECT * FROM administrativo WHERE Nombre = ? AND ClaveUnica = ? AND Contraseña = ?';

    db.query(query, [nombre, claveUnica, contraseña], (err, results) => {
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
    const sql = 'SELECT * FROM empleado';
    db.query(sql, (err, results) => {
        if (err) {
            console.error('Error querying empleado table:', err);
            return res.status(500).send('Error querying empleado table: ' + err.message);
        }
        res.status(200).send(results);
    });
});

app.get('/api/clientes', (req, res) => {
    const sql = 'SELECT * FROM cliente';
    db.query(sql, (err, results) => {
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
    db.query(sql, [id_cliente, mensaje, fecha, hora], (err, result) => {
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
    db.query(sql, (err, results) => {
        if (err) {
            console.error('Error calling ObtenerMensajes:', err);
            return res.status(500).send('Error retrieving messages: ' + err.message);
        }
        res.status(200).send(results[0]); // Results are nested inside an array
    });
});

// Ruta para obtener mensajes por cliente
app.get('/api/mensajes/:id_cliente', (req, res) => {
    const { id_cliente } = req.params;
    const sql = 'CALL ObtenerMensajesPorCliente(?)';
    db.query(sql, [id_cliente], (err, results) => {
        if (err) {
            console.error('Error calling ObtenerMensajesPorCliente:', err);
            return res.status(500).send('Error retrieving messages: ' + err.message);
        }
        res.status(200).send(results[0]); // Results are nested inside an array
    });
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
