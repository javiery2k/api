var express = require('express');
var app = express();
var cors = require('cors');
var dbConfig = require('./dbconfig.js');
var dbScheme = require('./dbscheme.js');
var oracledb = require('oracledb');
var bodyParser = require('body-parser')
oracledb.outFormat = oracledb.OBJECT;
oracledb.autoCommit = true;

app.use(cors());
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({extended: false}))

// parse application/json
app.use(bodyParser.json())

var api = {
  getInsertObject: (obj) => {
    return new Promise((resolve, reject) => {
      const params = [];
      const values = [];
      const req = obj.req;
      const table = obj.table;
      const scheme = dbScheme[table];
      Object.keys(scheme).map((index) => {
        values.push(`:${scheme[index]}`);
        params.push((req.body[scheme[index]]) || '');
      });
      resolve({sql: `INSERT INTO ${table} VALUES (${values.join(',')})`, params: params})
    })
  },
  execute: (obj) => {
    var sql = obj.sql;
    var params = (obj.params) || {};
    return new Promise((resolve, reject) => {
      oracledb.getConnection(dbConfig).then((conn) => {
        conn.execute(sql, params).then((result) => {
          conn.close();
          resolve(result);
        }).catch((error) => {
          conn.close();
          reject(error);
        });
      });
    })
  }
}

/*Metodo de Autentication*/
app.route('/login').post((req, res) => {
  const obj = {
    sql: "select * from usuarios where usuario=:usuario and password=:password",
    params: [req.body.usuario, req.body.password]
  };
  api.execute(obj).then((result) => {
    res.json({status: 'ok', rows: result.rows});
  }).catch((error) => {
    res.json({status: 'error', error: error.message});
  });
});

/*Metodo de Proveedores*/
app.route('/proveedores').get((req, res) => {
  const obj = {
    sql: "select * from proveedores"
  };
  api.execute(obj).then((result) => {
    res.json({status: 'ok', rows: result.rows});
  }).catch((error) => {
    res.json({status: 'error', error: error.message});
  });
}).post((req, res) => {
  api.getInsertObject({table: 'proveedores', req: req}).then((obj) => {
    api.execute(obj).then((result) => {
      res.json({status: 'ok'});
    }).catch((error) => {
      res.json({status: 'error', error: error.message});
    });
  });
});

/*Metodo de Activos*/
app.route('/activos').get((req, res) => {
  const obj = {
    sql: "select * from activos"
  };
  api.execute(obj).then((result) => {
    res.json({status: 'ok', rows: result.rows});
  }).catch((error) => {
    res.json({status: 'error', error: error.message});
  });
}).post((req, res) => {
  api.getInsertObject({table: 'activos', req: req}).then((obj) => {
    api.execute(obj).then((result) => {
      res.json({status: 'ok'});
    }).catch((error) => {
      res.json({status: 'error', error: error.message});
    });
  });
});

/*Metodo de Medidas*/
app.route('/medidas').get((req, res) => {
  const obj = {
    sql: "select * from medidas"
  };
  api.execute(obj).then((result) => {
    res.json({status: 'ok', rows: result.rows});
  }).catch((error) => {
    res.json({status: 'error', error: error.message});
  });
}).post((req, res) => {
  api.getInsertObject({table: 'medidas', req: req}).then((obj) => {
    api.execute(obj).then((result) => {
      res.json({status: 'ok'});
    }).catch((error) => {
      res.json({status: 'error', error: error.message});
    });
  });
});

/*Metodo de Requisiciones*/
app.route('/requisiciones').get((req, res) => {
  const obj = {
    sql: "select * from requisiciones"
  };
  api.execute(obj).then((result) => {
    res.json({status: 'ok', rows: result.rows});
  }).catch((error) => {
    res.json({status: 'error', error: error.message});
  });
}).post((req, res) => {
  api.getInsertObject({table: 'requisiciones', req: req}).then((obj) => {
    api.execute(obj).then((result) => {
      res.json({status: 'ok'});
    }).catch((error) => {
      res.json({status: 'error', error: error.message});
    });
  });
});

/*Si el metodo no es encontrado respondemos con un error*/
app.all('*', (req, res) => {
  res.json({status: 'error', rows: {}});
});

/*Servidor escuchando por el puerto 3001*/
app.listen(3001, () => {
  console.log('RESTful API server started on: 3001');
});
