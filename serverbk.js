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
    getScheme: (table, req) => {
        return new Promise((resolve) => {
            const params = [];
            const values = [];
            const data = {};
            const scheme = dbScheme[table];
            const id = req.body[scheme[0]] || 0;
            const metodo = (id > 0) ? 'edit' : 'add';

            Object.keys(scheme).map((index) => {
                if (metodo == 'add') {
                    params.push(`${scheme[index]}`);
                    if (parseInt(index) === 0) {
                        values.push(`${table}_seq.nextval`);
                    } else {
                        values.push(`:${scheme[index]}`);
                        if (scheme[index] === 'fecha') {
                            data[scheme[index]] = new Date();
                        } else {
                            data[scheme[index]] = req.body[scheme[index]] || '';
                        }
                    }
                }

                if (metodo == 'edit') {
                    params.push(`${scheme[index]}`);
                    if (parseInt(index) !== 0 && scheme[index] !== 'fecha') {
                        values.push(`${scheme[index]}=:${scheme[index]}`);
                        data[scheme[index]] = req.body[scheme[index]] || '';
                    }
                }
            });

            let sql;
            if (metodo == 'edit')
                sql = `UPDATE ${table} SET ${values.join(",")} WHERE ${dbScheme[table][0]} = ${id} RETURNING ${dbScheme[table][0]} INTO :id`;
            else
                sql = `INSERT INTO ${table} (${params.join(",")}) values(${values.join(",")}) RETURNING ${dbScheme[table][0]} INTO :id`;

            data['id'] = { type: oracledb.NUMBER, dir: oracledb.BIND_OUT };
            resolve({ sql: sql, data: data });
        });
    },
    recursivelyLowercaseJSONKeys: (obj) => {
        if (Object.prototype.toString.call(obj) === '[object Array]') {
            return obj.map(o => api.recursivelyLowercaseJSONKeys(o));
        }
        const ret = {};
        const keys = Object.keys(Object(obj));
        for (let i = 0; i < keys.length; i += 1) {
            ret[keys[i].toLowerCase()] = (obj[keys[i]]) || '';
        }
        return ret;
    }
}


app.route('/autocomplete/catalogo/').get((req, res) => {
    const q = req.query.q;
    const sql = `SELECT idcatalogo as value,nombre as label  from ${table} WHERE lower(nombre) LIKE lower('${q}%') OR lower(marca) LIKE lower('${q}%') OR lower(descripcion) LIKE lower('${q}%')`;
    oracledb.getConnection(dbConfig).then((conn) => {
        conn.execute(sql, {}).then((result) => {
            res.json({ status: 'ok', rows: api.recursivelyLowercaseJSONKeys(result.rows), total: ((result.rows[0]) ? result.rows[0].TOTAL : 0) });
        }).catch((error) => {
            res.json({ status: 'error', error: error.message });
        });
    }).catch(function(err) {
        res.json({ status: 'error', error: 'problema de coneccion' });
    });
});

app.route('/autocomplete/medidas/').get((req, res) => {
    const q = req.query.q;
    const sql = `SELECT idmedida as value, nombre as label from ${table} WHERE lower(abreviatura) LIKE lower('${q}%') OR lower(nombre) LIKE lower('${q}%') OR lower(descripcion) LIKE lower('${q}%')`;
    oracledb.getConnection(dbConfig).then((conn) => {
        conn.execute(sql, {}).then((result) => {
            res.json({ status: 'ok', rows: api.recursivelyLowercaseJSONKeys(result.rows), total: ((result.rows[0]) ? result.rows[0].TOTAL : 0) });
        }).catch((error) => {
            res.json({ status: 'error', error: error.message });
        });
    }).catch(function(err) {
        res.json({ status: 'error', error: 'problema de coneccion' });
    });
});

app.route('/autocomplete/objeto_gasto/').get((req, res) => {
    const q = req.query.q;
    const sql = `SELECT idobjeto_gasto as value, nombre as label from ${table} WHERE lower(nombre) LIKE lower('${q}%') OR lower(descripcion) LIKE lower('${q}%') OR lower(codigo) LIKE lower('${q}%')`;
    oracledb.getConnection(dbConfig).then((conn) => {
        conn.execute(sql, {}).then((result) => {
            res.json({ status: 'ok', rows: api.recursivelyLowercaseJSONKeys(result.rows), total: ((result.rows[0]) ? result.rows[0].TOTAL : 0) });
        }).catch((error) => {
            res.json({ status: 'error', error: error.message });
        });
    }).catch(function(err) {
        res.json({ status: 'error', error: 'problema de coneccion' });
    });
});

app.route('/autocomplete/:method/').get((req, res) => {
    const table = req.params.method;
    const q = req.query.q;
    if (dbScheme[table]) {
        let sql = '';
        switch (table) {
            case 'catalogo':
                sql = `SELECT idcatalogo as value,nombre as label  from ${table} WHERE lower(nombre) LIKE lower('${q}%') OR lower(marca) LIKE lower('${q}%') OR lower(descripcion) LIKE lower('${q}%')`;
                break;
            case 'medidas':
                sql = `SELECT idmedida as value, nombre as label from ${table} WHERE lower(abreviatura) LIKE lower('${q}%') OR lower(nombre) LIKE lower('${q}%') OR lower(descripcion) LIKE lower('${q}%')`;
                break;
            case 'objeto_gasto':
                sql = `SELECT idobjeto_gasto as value, nombre as label from ${table} WHERE lower(nombre) LIKE lower('${q}%') OR lower(descripcion) LIKE lower('${q}%') OR lower(codigo) LIKE lower('${q}%')`;
                break;
        }

        oracledb.getConnection(dbConfig).then((conn) => {
            conn.execute(sql, {}).then((result) => {
                res.json({ status: 'ok', rows: api.recursivelyLowercaseJSONKeys(result.rows), total: ((result.rows[0]) ? result.rows[0].TOTAL : 0) });
            }).catch((error) => {
                res.json({ status: 'error', error: error.message });
            });
        }).catch(function(err) {
            res.json({ status: 'error', error: 'problema de coneccion' });
        });
    } else {
        res.json({ status: 'error', error: 'metodo o accion invalida.' });
    }
});

/*Metodo de Autentication*/
app.route('/login').post((req, res) => {
    oracledb.getConnection(dbConfig).then((conn) => {
        conn.execute(`select ${dbScheme['usuarios'].join(",")} from usuarios where usuario=:usuario and password=:password`, [req.body.usuario, req.body.password]).then((result) => {
            if (result.rows.length > 0)
                res.json({ status: 'ok', rows: api.recursivelyLowercaseJSONKeys(result.rows) });
            else
                res.json({ status: 'error', error: 'Usuario o password invalidos.' });
        }).catch((error) => {
            res.json({ status: 'error', error: error.message });
        });
    }).catch(function(err) {
        res.json({ status: 'error', error: 'problema de coneccion' });
    });
});


/*Obtener data por de cualquier tabla*/
app.route('/:method/').get((req, res) => {
    const table = req.params.method;
    if (dbScheme[table]) {
        const curpage = req.query.pageNumber || 1;
        const perpage = req.query.perpage || 10;
        const start = ((curpage * perpage) - perpage) + 1;
        const end = (curpage * perpage);
        const sql = `SELECT * FROM (SELECT ROWNUM rnum, a.* FROM (select (COUNT(*) OVER ()) as total, resultado.* from ${table} resultado order by ${dbScheme[table][0]} desc) a) WHERE rnum BETWEEN ${start} AND ${end}`;
        oracledb.getConnection(dbConfig).then((conn) => {
            conn.execute(sql, {}).then((result) => {
                res.json({ status: 'ok', rows: api.recursivelyLowercaseJSONKeys(result.rows), total: ((result.rows[0]) ? result.rows[0].TOTAL : 0) });
            }).catch((error) => {
                res.json({ status: 'error', error: error.message });
            });
        }).catch(function(err) {
            res.json({ status: 'error', error: 'problema de coneccion' });
        });
    } else {
        res.json({ status: 'error', error: 'metodo o accion invalida.' });
    }
}).post((req, res) => {
    const table = req.params.method;
    if (dbScheme[table]) {
        api.getScheme(table, req).then((result) => {
            oracledb.getConnection(dbConfig).then((conn) => {
                conn.execute(result.sql, result.data).then((result) => {
                    res.json({ status: 'ok', id: result.outBinds.id[0] });
                }).catch((error) => {
                    res.json({ status: 'error', error: error.message });
                });
            }).catch(function(err) {
                res.json({ status: 'error', error: 'problema de coneccion' });
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
                res.json({ status: 'ok', rows: api.recursivelyLowercaseJSONKeys(result.rows), total: result.rows.length });
            }).catch((error) => {
                res.json({ status: 'error', error: error.message });
            });
        }).catch(function(err) {
            res.json({ status: 'error', error: 'problema de coneccion' });
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
