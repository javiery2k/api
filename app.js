var express = require('express');
var cors = require('cors');
var app = express();
const port = 3001;

app.use(cors());

// POST method route
app.get('/login', function(req, res) {
  const json = {
    status: 'ok',
    data: {
      nombre: 'Javier',
      apellido: 'Moran',
      photo: '/img/avatars/6.jpg'
    }
  }
  res.send(json);
});

app.get('/session', function(req, res) {
  const json = {
    id: 1,
    nombre: 'Javier',
    apellido: 'Moran',
    photo: '/img/avatars/6.jpg'
  }
  res.send(json);
});

app.get('/requisiciones', function(req, res) {
  res.send('requisiciones');
});


app.listen(3001, function() {
  console.log('Levantando el servido de nodejs');
  console.log('API esta listo.');
  console.log('Ingrese a la siguiente direccion para ver el api http://localhost:' + port);
});
