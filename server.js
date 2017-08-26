var express = require('express');
var app = express();
var cors = require('cors');
var dbConfig = require('./dbconfig.js');
var oracledb = require('oracledb');
oracledb.outFormat = oracledb.OBJECT;

app.use(cors());

/*Autentication*/
app.route('/session').get((req, res) => {
  oracledb.getConnection(dbConfig).then((conn) => {
    return conn.execute("SELECT * FROM usuarios").then((result) => {
      let obj = {
        status: 'ok'
      };
      if (result.rows.length > 0) {
        obj.data = result.rows[0];
        res.json(obj);
      } else {
        res.json({status: 'error'});
      }
      return conn.close();
    }).catch((err) => {
      return conn.close();
    });
  })
});

app.route('/requisiciones').get((req, res) => {
  oracledb.getConnection(dbConfig).then((conn) => {
    return conn.execute("SELECT * FROM requisiciones WHERE 1=1").then((result) => {
      if (result.rows.length > 0)
        res.json(result.rows);
      else
        res.json({});
      return conn.close();
    }).catch((err) => {
      console.error(err);
      return conn.close();
    });
  })
});

app.all('*', (req, res) => {
  res.json({status: 'error', data: {}});
});

app.listen(3001, () => {
  console.log('RESTful API server started on: 3001');
});
