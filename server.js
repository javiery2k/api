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
            console.log(req.params)
            console.log(id)
            console.log(scheme[0])
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
    getSchemeBK: (table, req) => {
        return new Promise((resolve) => {
            const params = [];
            const values = [];
            const data = {};
            const scheme = dbScheme[table];
            Object.keys(scheme).map((index) => {
                params.push(`${scheme[index]}`);
                if (parseInt(index) !== 0) {
                    values.push(`:${scheme[index]}`);
                    if (scheme[index] === 'fecha' && (req.body[scheme[index]] === null || req.body[scheme[index]] === '' || req.body[scheme[index]] === 'undefined')) {
                        data[scheme[index]] = new Date();
                    } else {
                        data[scheme[index]] = req.body[scheme[index]] || '';
                    }
                }
            });
            data['id'] = { type: oracledb.NUMBER, dir: oracledb.BIND_OUT };
            resolve({ params: params, values: values, data: data });
        });
    },
    getQuery: (table, req) => {
        return new Promise((resolve) => {
            const curpage = req.query.pageNumber || 1;
            const perpage = req.query.perpage || 10;
            const start = ((curpage * perpage) - perpage) + 1;
            const end = (curpage * perpage);
            const sql = `SELECT * FROM (SELECT ROWNUM rnum, a.* FROM (select (COUNT(*) OVER ()) as total, resultado.* from ${table} resultado order by ${dbScheme[table][0]} desc) a) WHERE rnum BETWEEN ${start} AND ${end}`;
            resolve({ sql: sql });
        });
    }
}


/*Metodo de Autentication*/
app.route('/login').post((req, res) => {
    oracledb.getConnection(dbConfig).then((conn) => {
        conn.execute("select * from usuarios where usuario=:usuario and password=:password", [req.body.usuario, req.body.password]).then((result) => {
            res.json({ status: 'ok', rows: result.rows });
        }).catch((error) => {
            res.json({ status: 'error', error: error.message });
        });
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
                res.json({ status: 'ok', rows: result.rows, total: ((result.rows[0]) ? result.rows[0].TOTAL : 0) });
            }).catch((error) => {
                res.json({ status: 'error', error: error.message });
            });
        });
    } else {
        res.json({ status: 'error', error: 'metodo o accion invalida.' });
    }
}).post((req, res) => {
    const table = req.params.method;
    if (dbScheme[table]) {
        api.getScheme(table, req).then((result) => {
            console.log(result)
            oracledb.getConnection(dbConfig).then((conn) => {
                conn.execute(result.sql, result.data).then((result) => {
                    res.json({ status: 'ok', id: result.outBinds.id[0] });
                }).catch((error) => {
                    res.json({ status: 'error', error: error.message });
                });
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
                res.json({ status: 'ok', rows: result.rows, total: result.rows.length });
            }).catch((error) => {
                res.json({ status: 'error', error: error.message });
            });
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
