var express = require('express');
var app = express();
var cors = require('cors');
var dbConfig = require('./dbconfig.js');
var dbScheme = require('./dbscheme.js');
var oracledb = require('oracledb');
var bodyParser = require('body-parser')
oracledb.outFormat = oracledb.OBJECT;
oracledb.fetchAsString = [oracledb.DATE];
oracledb.autoCommit = true;

app.use(cors());

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))

// parse application/json
app.use(bodyParser.json())

var api = {
    getInsert: (req) => {
        const table = req.params.method;
        const params = [];
        const values = [];
        const data = { id: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT } };
        const scheme = dbScheme[table];

        Object.keys(scheme).map((index) => {
            params.push(`${scheme[index]}`);
            values.push((parseInt(index) === 0) ? `${table}_seq.nextval` : `:${scheme[index]}`);
            if (parseInt(index) > 0)
                data[scheme[index]] = (scheme[index] === 'fecha') ? new Date() : (req.body[scheme[index]] || '');
        });

        const sql = `INSERT INTO ${table} (${params.join(",")}) values(${values.join(",")}) RETURNING ${scheme[0]} INTO :id`;
        return ({ sql: sql, data: data });
    },
    getUpdate: (req) => {
        const table = req.params.method;
        const params = [];
        const values = [];
        const scheme = dbScheme[table];
        const dbid = parseInt(req.body[scheme[0]]) || 0;
        const data = { id: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }, dbid: dbid };
        Object.keys(scheme).map((index) => {
            params.push(`${scheme[index]}`);
            if (parseInt(index) !== 0 && scheme[index] !== 'fecha') {
                values.push(`${scheme[index]}=:${scheme[index]}`);
                data[scheme[index]] = req.body[scheme[index]] || '';
            }
        });
        const sql = `UPDATE ${table} SET ${values.join(",")} WHERE ${scheme[0]}=:dbid RETURNING ${scheme[0]} INTO :id`;
        return ({ sql: sql, data: data });
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
                    resolve({ sql: `SELECT 'idcatalogo' as field, idcatalogo as value, nombre as label, codigo from catalogo WHERE lower(nombre) LIKE lower('${q}%') OR lower(marca) LIKE lower('${q}%') OR lower(descripcion) LIKE lower('${q}%')` });;
                    break;
                case 'medidas':
                    resolve({ sql: `SELECT 'idmedida' as field,  idmedida as value, nombre as label from medidas WHERE lower(abreviatura) LIKE lower('${q}%') OR lower(nombre) LIKE lower('${q}%') OR lower(descripcion) LIKE lower('${q}%')` });
                    break;
                case 'objeto_gasto':
                    resolve({ sql: `SELECT 'idobjeto_gasto' as field, idobjeto_gasto as value, CONCAT(CONCAT(codigo , '-'),nombre) as label from ${table} WHERE lower(nombre) LIKE lower('${q}%') OR lower(descripcion) LIKE lower('${q}%') OR lower(codigo) LIKE lower('${q}%')` });
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
            resolve({ sql: `SELECT * FROM (SELECT ROWNUM rnum, a.* FROM (select (COUNT(*) OVER ()) as total, resultado.* from ${table} resultado order by ${dbScheme[table][0]} desc) a) WHERE rnum BETWEEN ${start} AND ${end}` });
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
            oracledb.getConnection(dbConfig).then((conn) => {
                conn.execute(obj.sql, {}).then((result) => {
                    res.json({ status: 'ok', rows: api.lowercaseKeys(result.rows)});
                }).catch((error) => {
                    res.json({ status: 'error', error: error.message });
                });
            }).catch(function(err) {
                res.json({ status: 'error', error: 'problema de conexion' });
            });
        })
    } else {
        res.json({ status: 'error', error: 'metodo o accion invalida.' });
    }
});


app.route('/login').post((req, res) => {
    oracledb.getConnection(dbConfig).then((conn) => {
        conn.execute(`select ${dbScheme['usuarios'].join(",")} from usuarios where usuario=:usuario and password=:password`, [req.body.usuario, req.body.password]).then((result) => {
            if (result.rows.length > 0)
                res.json({ status: 'ok', rows: api.lowercaseKeys(result.rows) });
            else
                res.json({ status: 'error', error: 'Usuario o password invalidos.' });
        }).catch((error) => {
            res.json({ status: 'error', error: error.message });
        });
    }).catch(function(err) {
        res.json({ status: 'error', error: 'problema de conexion' });
    });
});


app.route('/requisiciones/').post((req, res) => {
    api.getScheme(req).then((obj) => {
        oracledb.getConnection(dbConfig).then((conn) => {
            conn.execute(obj.sql, obj.data).then((result) => {
                res.json({ status: 'ok', id: result.outBinds.id[0] });
            }).catch((error) => {
                res.json({ status: 'error', error: error.message });
            });
        }).catch(function(err) {
            res.json({ status: 'error', error: 'problema de conexion' });
        });
    });
});


/*Obtener data por de cualquier tabla*/
app.route('/:method/').get((req, res) => {
    const table = req.params.method;
    if (dbScheme[table]) {
        api.getSelectSql(req).then((obj) => {
            oracledb.getConnection(dbConfig).then((conn) => {
                conn.execute(obj.sql, {}).then((result) => {
                    res.json({ status: 'ok', rows: api.lowercaseKeys(result.rows), total: ((result.rows[0]) ? result.rows[0].TOTAL : 0) });
                }).catch((error) => {
                    res.json({ status: 'error', error: error.message });
                });
            }).catch(function(err) {
                res.json({ status: 'error', error: 'problema de conexion' });
            });
        });
    } else {
        res.json({ status: 'error', error: 'metodo o accion invalida.' });
    }
}).post((req, res) => {
    const table = req.params.method;
    if (dbScheme[table]) {
        api.getScheme(req).then((obj) => {
            oracledb.getConnection(dbConfig).then((conn) => {
                conn.execute(obj.sql, obj.data).then((result) => {
                    res.json({ status: 'ok', id: result.outBinds.id[0] });
                }).catch((error) => {
                    res.json({ status: 'error', error: error.message });
                });
            }).catch(function(err) {
                res.json({ status: 'error', error: 'problema de conexion' });
            });
        });
    } else {
        res.json({ status: 'error', error: 'metodo o accion invalida.' });
    }
});

/*Obtener data por id de cualquier tabla*/
app.route('/:method/:id').get((req, res) => {
    const table = req.params.method;
    const id = req.params.id;
    if (dbScheme[table]) {
        oracledb.getConnection(dbConfig).then((conn) => {
            conn.execute(`select * from ${table} WHERE ${dbScheme[table][0]} = ${id}`, {}).then((result) => {
                res.json({ status: 'ok', rows: api.lowercaseKeys(result.rows) });
            }).catch((error) => {
                res.json({ status: 'error', error: error.message });
            });
        }).catch(function(err) {
            res.json({ status: 'error', error: 'problema de conexion' });
        });
    } else {
        res.json({ status: 'error', error: 'metodo o accion invalida.' });
    }
});

/*Si el metodo no es encontrado respondemos con un error por default*/
app.all('*', (req, res) => {
    res.json({ status: 'error', error: 'metodo o accion invalida.' });
});

/*Servidor escuchando por el puerto 3001*/
var port = 3001;
app.listen(port, () => {
    console.log('RESTful API server iniciado en el puerto: ' + port);
});
