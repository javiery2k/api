const express = require('express');
const moment = require('moment-timezone');
const app = express();
const cors = require('cors');
const dbConfig = require('./dbconfig.js');
const dbScheme = require('./dbscheme.js');
const bodyParser = require('body-parser')
const mysql = require('mysql');
const momentFormat = 'YYYY-MM-DD HH:mm:ss';

/*var connection = mysql.createConnection({
    host: 'localhost',
    connectionLimit: 1,
    user: 'root',
    password: '',
    database: 'bddatos'
});*/

var connection = mysql.createConnection({
    host: 'g8mh6ge01lu2z3n1.cbetxkdyhwsb.us-east-1.rds.amazonaws.com',
    connectionLimit: 1,
    user: 'y39bu9wx750m5821',
    password: 'awp14himxhb37ad9',
    database: 'qwok9hiss0vhurnr'
});


app.use(cors());

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({
    extended: false
}))


var api = {
    getInsert: (req) => {
        const table = req.params.method;
        const params = [];
        const values = [];
        const scheme = dbScheme[table];

        Object.keys(scheme).map((index) => {
            if (parseInt(index) > 0) {
                params.push(`${scheme[index]}`);
                values.push(scheme[index] === 'fecha' ? `'${moment(new Date()).format(momentFormat)}'` : `'${req.body[scheme[index]]}'`);
            }
        });
        const sql = `INSERT INTO ${table} (${params.join(",")}) values(${values.join(",")})`;
        return ({
            sql: sql
        });
    },
    getUpdate: (req) => {
        const table = req.params.method;
        const params = [];
        const values = [];
        const scheme = dbScheme[table];
        const dbid = parseInt(req.body[scheme[0]]) || 0;
        const data = {};
        Object.keys(scheme).map((index) => {
            params.push(`${scheme[index]}`);
            if (scheme[index] !== 'fecha') {
                values.push(`${scheme[index]}='${req.body[scheme[index]]}'`);
                data[scheme[index]] = req.body[scheme[index]] || '';
            }
        });
        const sql = `UPDATE ${table} SET ${values.join(",")} WHERE ${scheme[0]}=${dbid}`;
        return ({
            sql: sql,
            dbid
        });
    },
    getScheme: (req) => {
        const table = req.params.method;
        const scheme = dbScheme[table];
        const id = req.body[scheme[0]] || 0;
        const metodo = (id > 0) ? 'edit' : 'add';
        return new Promise((resolve) => {
            if (metodo === 'add') {
                resolve(api.getInsert(req));
            } else {
                resolve(api.getUpdate(req));
            }
        });
    },
    getAutocomplete: (req) => {
        const table = req.params.method;
        const q = req.query.q;
        return new Promise((resolve) => {
            switch (table) {
                case 'catalogo':
                    resolve({
                        sql: `SELECT 'idcatalogo' as field, idcatalogo as value, nombre as label, codigo from catalogo WHERE lower(nombre) LIKE lower('${q}%') OR lower(marca) LIKE lower('${q}%') OR lower(descripcion) LIKE lower('${q}%')`
                    });;
                    break;
                case 'medidas':
                    resolve({
                        sql: `SELECT 'idmedida' as field,  idmedida as value, nombre as label from medidas WHERE lower(abreviatura) LIKE lower('${q}%') OR lower(nombre) LIKE lower('${q}%') OR lower(descripcion) LIKE lower('${q}%')`
                    });
                    break;
                case 'objeto_gasto':
                    resolve({
                        sql: `SELECT 'idobjeto_gasto' as field, idobjeto_gasto as value, CONCAT(CONCAT(codigo , '-'),nombre) as label from ${table} WHERE lower(nombre) LIKE lower('${q}%') OR lower(descripcion) LIKE lower('${q}%') OR lower(codigo) LIKE lower('${q}%')`
                    });
                    break;
            }
        });

    },
    getSelectSql: (req) => {
        const table = req.params.method;
        const curpage = req.query.pageNumber || 1;
        const perpage = req.query.perpage || 10;
        const start = ((curpage * perpage) - perpage) + 1;
        const end = (curpage * perpage);

        return new Promise((resolve) => {
            resolve({
                sql: `SELECT *, count(${dbScheme[table][0]}) as total from ${table} group by ${dbScheme[table][0]} desc`
            });
        });
    },
    lowercaseKeys: (obj) => {
        if (Object.prototype.toString.call(obj) === '[object Array]') {
            return obj.map(o => api.lowercaseKeys(o));
        }
        const ret = {};
        const keys = Object.keys(Object(obj));
        for (let i = 0; i < keys.length; i += 1) {
            ret[keys[i].toLowerCase()] = (obj[keys[i]]) || '';
        }
        return ret;
    }
}



app.route('/autocomplete/:method/').get((req, res) => {
    const table = req.params.method;
    if (dbScheme[table]) {
        api.getAutocomplete(req).then((obj) => {
            connection.getConnection(dbConfig).then((conn) => {
                conn.execute(obj.sql, {}).then((result) => {
                    res.json({
                        status: 'ok',
                        rows: api.lowercaseKeys(result.rows)
                    });
                }).catch((error) => {
                    res.json({
                        status: 'error',
                        error: error.message
                    });
                });
            }).catch(function(err) {
                res.json({
                    status: 'error',
                    error: 'problema de conexion'
                });
            });
        })
    } else {
        res.json({
            status: 'error',
            error: 'metodo o accion invalida.'
        });
    }
});


app.route('/login').post((req, res) => {
    const usuario = req.body.usuario;
    const password = req.body.password;
    connection.query(`select * from usuarios where usuario='${usuario}' and password='${password}'`, (error, results) => {
        if (error)
            res.json({
                status: 'error',
                error: error
            });

        if (results.length > 0) {
            res.json({
                status: 'ok',
                rows: results
            });
        } else {
            res.json({
                status: 'error',
                error: 'Usuario o password invalidos.'
            });
        }
    });

});


app.route('/requisiciones/').post((req, res) => {
    api.getScheme(req).then((obj) => {
        connection.getConnection(dbConfig).then((conn) => {
            conn.execute(obj.sql).then((result) => {
                res.json({
                    status: 'ok',
                    id: obj.dbid
                });
            }).catch((error) => {
                res.json({
                    status: 'error',
                    error: error.message
                });
            });
        }).catch(function(err) {
            res.json({
                status: 'error',
                error: 'problema de conexion'
            });
        });
    });
});


/*Obtener data por de cualquier tabla*/
app.route('/:method/').get((req, res) => {

    const table = req.params.method;
    if (dbScheme[table]) {
        api.getSelectSql(req).then((obj) => {
            connection.query(obj.sql, (error, results) => {
                if (error)
                    res.json({
                        status: 'error',
                        error: error
                    });

                if (results.length > 0) {
                    res.json({
                        status: 'ok',
                        rows: results
                    });
                } else {
                    res.json({
                        status: 'error',
                        error: 'Usuario o password invalidos.'
                    });
                }
            });
        });
    } else {
        res.json({
            status: 'error',
            error: 'metodo o accion invalida.'
        });
    }
}).post((req, res) => {
    const table = req.params.method;
    if (dbScheme[table]) {
        api.getScheme(req).then((obj) => {
            connection.query(obj.sql, (error, results) => {
                if (error)
                    res.json({
                        status: 'error',
                        error: error
                    });

                if (results.affectedRows > 0) {
                    res.json({
                        status: 'ok',
                        id: (results.insertId) || obj.dbid
                    });
                } else {
                    res.json({
                        status: 'error',
                        error: 'Problema en el Query.'
                    });
                }
            });
        });
    } else {
        res.json({
            status: 'error',
            error: 'metodo o accion invalida.'
        });
    }
});

/*Obtener data por id de cualquier tabla*/
app.route('/:method/:id').get((req, res) => {
    const table = req.params.method;
    const id = req.params.id;
    if (dbScheme[table]) {
        connection.query(`select * from ${table} WHERE ${dbScheme[table][0]} = ${id}`, (error, results) => {
            if (error)
                res.json({
                    status: 'error',
                    error: error
                });

            if (results.length > 0) {
                res.json({
                    status: 'ok',
                    rows: results
                });
            } else {
                res.json({
                    status: 'error',
                    error: 'Usuario o password invalidos.'
                });
            }
        });
    } else {
        res.json({
            status: 'error',
            error: 'metodo o accion invalida.'
        });
    }
});

/*Si el metodo no es encontrado respondemos con un error por default*/
app.all('*', (req, res) => {
    res.json({
        status: 'error',
        error: 'metodo o accion invalida.'
    });
});

/*Servidor escuchando por el puerto 3001*/
var port = 3001;
app.listen(port, () => {
    console.log('RESTful API server iniciado en el puerto: ' + port);
});
