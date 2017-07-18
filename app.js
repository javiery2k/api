var express = require('express');
var app = express();


// GET method route
app.get('/', function (req, res) {
  res.send('GET request to the homepage');
});

// POST method route
app.post('/', function (req, res) {
  res.send('POST request to the homepage');
});

app.get('/about', function (req, res) {
  res.send('about');
});


app.listen(3001, function () {
  console.log('Ready');
});
