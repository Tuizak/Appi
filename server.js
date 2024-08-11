const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const port = 3001;

app.use(cors());
app.use(bodyParser.json());

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'integradora2'
});

db.connect(err => {
  if (err) {
    console.error('Error connecting to the database:', err);
    return;
  }
  console.log('Connected to the database');
});

const entities = {
  clientes: ['Nombre', 'Zona', 'Direccion', 'Celular', 'Correo', 'Contraseña', 'Estado'],
  empleados: ['Nombre', 'CURP', 'RFC', 'Direccion', 'Fecha_nac', 'Contraseña', 'Estado', 'Telefono'],
  administrativos: ['id', 'Nombre', 'ClaveUnica', 'Contraseña', 'Fecha_nac', 'RFC', 'CURP', 'Direccion', 'Comentarios', 'Estado'],
  tinacos: ['id_cliente', 'Litros', 'Nivel'],
  mantenimientos: ['id_Tinaco', 'Comentarios', 'Realizado', 'Fecha', 'Hora'],
  mensajes: ['id_cliente', 'id_administrativo', 'Mensaje', 'Fecha', 'Hora']
};

// CRUD endpoints for each entity
Object.keys(entities).forEach(entity => {
  // Create
  app.post(`/api/${entity}`, (req, res) => {
    const data = req.body;
    const columns = Object.keys(data).join(', ');
    const values = Object.values(data);
    const placeholders = values.map(() => '?').join(', ');
    const sql = `INSERT INTO ${entity} (${columns}) VALUES (${placeholders})`;
    db.query(sql, values, (err, result) => {
      if (err) {
        return res.status(500).send(err);
      }
      res.status(201).send(result);
    });
  });

  // Read all
  app.get(`/api/${entity}`, (req, res) => {
    const sql = `SELECT * FROM ${entity}`;
    db.query(sql, (err, results) => {
      if (err) {
        return res.status(500).send(err);
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
        return res.status(500).send(err);
      }
      res.status(200).send(results);
    });
  });

  // Read by nombre
  app.get(`/api/${entity}/nombre/:nombre`, (req, res) => {
    const { nombre } = req.params;
    const sql = `SELECT * FROM ${entity} WHERE Nombre = ?`;
    db.query(sql, [nombre], (err, results) => {
      if (err) {
        return res.status(500).send(err);
      }
      res.status(200).send(results);
    });
  });

  // Update by id
  app.put(`/api/${entity}/id/:id`, (req, res) => {
    const { id } = req.params;
    const data = req.body;
    const columns = Object.keys(data).map(key => `${key} = ?`).join(', ');
    const values = Object.values(data);
    values.push(id);
    const sql = `UPDATE ${entity} SET ${columns} WHERE id = ?`;
    db.query(sql, values, (err, result) => {
      if (err) {
        return res.status(500).send(err);
      }
      res.status(200).send(result);
    });
  });

  // Update by nombre
  app.put(`/api/${entity}/nombre/:nombre`, (req, res) => {
    const { nombre } = req.params;
    const data = req.body;
    const columns = Object.keys(data).map(key => `${key} = ?`).join(', ');
    const values = Object.values(data);
    values.push(nombre);
    const sql = `UPDATE ${entity} SET ${columns} WHERE Nombre = ?`;
    db.query(sql, values, (err, result) => {
      if (err) {
        return res.status(500).send(err);
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
        return res.status(500).send(err);
      }
      res.status(200).send(result);
    });
  });

  // Delete by nombre
  app.delete(`/api/${entity}/nombre/:nombre`, (req, res) => {
    const { nombre } = req.params;
    const sql = `DELETE FROM ${entity} WHERE Nombre = ?`;
    db.query(sql, [nombre], (err, result) => {
      if (err) {
        return res.status(500).send(err);
      }
      res.status(200).send(result);
    });
  });
});

// Endpoint específico para obtener datos de un usuario administrativo por ID
app.get('/user/:id', (req, res) => {
  const userId = req.params.id;
  const query = 'SELECT * FROM administrativo WHERE id = ?';
  
  db.query(query, [userId], (err, result) => {
    if (err) {
      console.error('Error fetching user data:', err);
      res.status(500).send('Error fetching user data');
      return;
    }
    res.json(result[0]);
  });
});

app.post('/Home', (req, res) => {
  const { nombre, claveUnica, contraseña } = req.body;
  const query = 'SELECT * FROM administrativo WHERE Nombre = ? AND ClaveUnica = ? AND Contraseña = ?';
  db.query(query, [nombre, claveUnica, contraseña], (err, results) => {
    if (err) {
      console.error('Error querying the database:', err);
      return res.status(500).send('Error querying the database: ' + err.message);
    } else if (results.length > 0) {
      res.status(200).send('¡Inicio de sesión exitoso!');
    } else {
      res.status(401).send('Credenciales inválidas');
    }
  });
});


app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});