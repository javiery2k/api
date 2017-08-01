var express = require('express');

var cors = require('cors');
var app = express();
const port = process.env.PORT || 3001;

app.use(cors());

/*Autentication*/
app.route('/session')
  .get(function(req, res) {
    const data = {
      nombre: 'Javier',
      apellido: 'Moran',
      photo: 'https://s.gravatar.com/avatar/035e30f83e96379e1567fc976230c8e0'
    }
    res.json(data);
  });

/*Requisiciones*/
app.route('/requisiciones')
  .get(function(req, res) {
    const data =
      [{
        id: 1,
        numero: '0001',
        fecha: '10/10/2017',
        descripcion: 'Aqui una descripcion'
      }, {
        id: 2,
        numero: '0002',
        fecha: '10/10/2017',
        descripcion: 'Aqui una descripcion'
      }]

    res.json(data);
  })
  .post(function(req, res) {
    res.send('Agregar nueva requisicion')
  });

/*Requisicion byId*/
app.route('/requisiciones/:requisicionId')
  .get(function(req, res) {
    const requisicionId = req.params.requisicionId;
    res.send('Obener la requisicion con id: ' + requisicionId)
  })
  .post(function(req, res) {
    const requisicionId = req.params.requisicionId;
    res.send('Actualizar la requisicion con id: ' + requisicionId)
  });

app.listen(3001, function() {
  console.log('RESTful API server started on: ' + port);
});
