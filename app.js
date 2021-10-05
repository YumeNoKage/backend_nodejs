// THIRD-PARTY MODULES
const express = require('express')
const mysql = require('mysql')
const body_parser = require('body-parser')

const app = express()
const port = process.env.PORT || 4000

// USE THIRD-PARTY MODULE
app.use(body_parser.urlencoded({extended: true}))
app.use(body_parser.json())



// CREATE CONNECTION
const pool = mysql.createPool({
    connectionLimit: 10,
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'petty_cash',
})

// GET
// get item total cash
app.get('/total-cash', (req, res)=>{
    pool.getConnection((err, connection)=>{
        if (err) throw err

        connection.query('SELECT * from total_cash', (err, rows)=>{
            connection.release()

            if(!err){
                // res.writeHead(200, {'content-type':"application/javascript"})
                res.send(rows)
            } else {
                console.log(err)
            }
        })
    })
})

// get all item petty cash
app.get('/list-cash', (req, res)=>{
    pool.getConnection((err, connection)=>{
        if (err) throw err

        connection.query('SELECT * from list_petty_case', (err, rows)=>{
            connection.release()

            if(!err){
                res.send(rows)
            } else {
                console.log(err)
            }
        })
    })
})

// get by id
app.get('/:id', (req, res)=>{
    pool.getConnection((err, connection)=>{
        if (err) throw err

        connection.query('SELECT * from list_petty_case WHERE id = ?', [req.params.id], (err, rows)=>{
            connection.release()

            if(!err){
                res.send(rows)
            } else {
                console.log(err)
            }
        })
    })
})


// DELETE 
app.delete('/:id', (req, res)=>{
    pool.getConnection((err, connection)=>{
        if (err) throw err

        // UPDATE `list_petty_case` SET `delete_at` = '2021-09-08 21:10:26', `status` = '3' WHERE `list_petty_case`.`id` = 5
        connection.query('UPDATE list_petty_case SET delete_at = now()  WHERE id = ?', [req.params.id], (err, rows)=>{
            connection.release()

            if(!err){
                res.send('List has be deleted')
                res.end()
            } else {
                console.log(err)
            }
        })
    })
})


// POST NEW PETTY
app.post('/add', (req, res)=>{
    const params = req.body

    pool.getConnection((err, connection)=>{
        if (err) throw err

        // status documentation
        // income / expend
        connection.query('INSERT INTO list_petty_case SET ?', params, (err, rows)=>{
            if (err) throw err
        })  
    })

    pool.getConnection( async (err, connection)=>{
        if (err) throw err

        // for expend total cash
        if (params.status == 'expend' && params.total_id !== undefined){
            connection.query('UPDATE total_cash SET nominal = nominal - ?, last_expend = ?, last_update = now() WHERE id = ?', [params.nominal, params.nominal, params.total_id], (err, rows)=>{
                connection.release()
                if(!err){
                    res.send('Cash has be updated')
                    res.end()
                } else {
                    console.log(err)
                }
            })

        // for income total cash
        } else if (params.status === 'income' && params.total_id !== undefined){
            connection.query('UPDATE total_cash SET nominal = nominal + ?, last_income = ?, last_update = now() WHERE id = ?', [params.nominal, params.nominal, params.total_id], (err, rows)=>{
                connection.release()
                if(!err){
                    res.send('Cash has be updated')
                    res.end()
                } else {
                    console.log(err)
                }
            })

        // for create new total cash
        } else if(params.total_id === undefined){
            connection.query('INSERT INTO total_cash SET nominal = ?, last_income = ?, last_update = now()',[params.nominal, params.nominal], (err, rows)=>{
                connection.release()
                if(!err){
                    res.send('Item has be added')
                    res.end()
                } else {
                    console.log(err)
                }
            })
        }
    })
})


// UPDATE / PUT
app.put('/update/:id', (req, res)=>{
    pool.getConnection((err, connection)=>{
        if (err) throw err
    
        let {title, description, nominal, status} = req.body
        let id = req.params.id
        nominal = parseInt(nominal)
        status = parseInt(status)
        // let params = req.body
        let sql = `UPDATE list_petty_case SET title = ?, description = ?, nominal = ?, status = ? WHERE list_petty_case . id = ?`

        // status documentation
        // 0 = inactive, 1 = active, 2 = draf, 3 = complate, 4 = uncompleted
        connection.query(sql, [title, description, nominal, status, id], (err, rows)=>{
            connection.release()

            // console.log(data)
            if(!err){
                res.send('Item has be updated')
                res.end()
            } else {
                console.log(err)
                res.end()
            }
        })
    })
})

// UPDATE / PATCH
app.patch('/update/:id', (req, res)=>{
    pool.getConnection((err, connection)=>{
        if (err) throw err
        
        let id = req.params.id
        // status documentation
        // 0 = inactive, 1 = active, 2 = draf, 3 = complate, 4 = uncompleted

        let sql = `UPDATE list_petty_case SET ? WHERE list_petty_case . id = ?`

        connection.query(sql, [req.body, id], (err, rows) => {
            connection.release()

            if(!err){
                res.send('Item has be updated with patch')
                res.end()
            } else {
                console.log(err)
                res.end()
            }
        })
    })
})

// LISTEN SERVER RUN 
app.listen(port, ()=>{console.log('server run in port', port)})