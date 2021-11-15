// THIRD-PARTY MODULES
const express = require('express')
const mysql = require('mysql')
const body_parser = require('body-parser')
var cors = require('cors')
const { Console, log } = require('console')

const app = express()
const port = process.env.PORT || 4000

// USE THIRD-PARTY MODULE
app.use(cors())
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
                res.send(rows[0])
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

        const page = parseInt(req.query.page)
        const limit = parseInt(req.query.limit)
        const starIndex = (page -1 ) * limit
        const endIndex = page * limit
        connection.query('SELECT * from list_petty_case', (err, rows)=>{
            connection.release()

            if(!err){

                let totalPage = Math.ceil(rows.length / limit)
                
                const data = {
                    pagination:{
                        totalPage,
                        currentPage: page,
                        nextPage: page + 1 > totalPage ? null : page + 1,
                        prevPage: page - 1 <= 0 ? null : page - 1,
                    },
                    data:{
                        ...rows.slice(starIndex, endIndex)
                    }
                }
                
                res.send(data)
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
const getTotalCash = async function(){
    return new Promise((resolve, reject) => {
        let sql = `SELECT * from total_cash LIMIT 1`
        pool.query(sql, (err, result) => {

            if (err) throw err
            return resolve(result[0].id)
        })
    })
}

app.post('/add', async (req, res)=>{
    const params = req.body

    // tabulasi data to table total_cash
    // for expend total cash
    if (params.status == 'expend' && params.total_id !== undefined){
        new Promise((resolve, reject) => {
            pool.query('UPDATE total_cash SET nominal = nominal - ?, last_expend = ?, last_update = now(), expend_update_at = now() WHERE id = ?', [params.nominal, params.nominal, params.total_id], (err, rows)=>{
                // connection.release()
                if(!err){
                    return resolve()
                } else {
                    console.log(err)
                    return reject()
                }
            })
        })

    // for income total cash
    } else if (params.status === 'income' && params.total_id !== undefined){
        new Promise((resolve, reject) =>{
            pool.query('UPDATE total_cash SET nominal = nominal + ?, last_income = ?, last_update = now(), income_update_at = now() WHERE id = ?', [params.nominal, params.nominal, params.total_id], (err, rows)=>{
                // connection.release()
                if(!err){
                    return resolve()
                } else {
                    console.log(err)
                    return reject()
                }
            })
        })

    // for create new total cash
    } else if(params.total_id === undefined){
        new Promise((resolve, reject) =>{
            pool.query('INSERT INTO total_cash SET nominal = ?, last_income = ?, last_update = now(), income_update_at = now()',[params.nominal, params.nominal], (err, rows)=>{
                // connection.release()
                if(!err){
                    return resolve()
                } else {
                    console.log(err)
                    return reject()
                }
            })
        })
    }

    const getIdTotalCash = await getTotalCash()

    // add new data to list history in table list_petty_case
    pool.getConnection((err, connection)=>{
        if (err) throw err

        // status documentation
        // income / expend
        let data = {...params, total_id: getIdTotalCash}
        connection.query('INSERT INTO list_petty_case SET ?', data, (err, rows)=>{
            if (err) throw err

            res.send('Cash has be updated')
            res.end()
        })
    })

})


// UPDATE / PUT
const getNominal = (params) => {
    return new Promise((resolve, reject) => {
        let sql = `SELECT nominal FROM list_petty_case WHERE list_petty_case . id = ?`
        pool.query(sql, params.params.id, (err, result) => {
            if (err) throw err
            return resolve(result[0].nominal)
        })
    })
}

app.put('/update/:id', async (req, res)=>{

    let oldNominal = await getNominal(req)

    // update in history list_petty_cash
    pool.getConnection((err, connection)=>{
        if (err) throw err
    
        let {title, description, nominal, status} = req.body
        let id = parseInt(req.params.id)
        nominal = parseInt(nominal)

        let sql = `UPDATE list_petty_case SET title = ?, description = ?, nominal = ?, status = ? WHERE list_petty_case . id = ?`
        
        connection.query(sql, [title, description, nominal, status, id], (err, rows)=>{
            connection.release()
            if (err) throw err
        })
    })

    // update total cash
    pool.getConnection((err, connection)=>{
        if (err) throw err

        let params = {...req.body, nominal: parseInt(req.body.nominal), total_id: parseInt(req.body.id_total)}

        // for expend total cash
        if (params.status == 'expend' && params.total_id !== undefined){
            let newNominal =  params.nominal - oldNominal

            let sql = `UPDATE total_cash SET nominal = nominal - ?, last_expend = ?, last_update = now(), expend_update_at = now() WHERE id = ?`
            connection.query(sql, [newNominal, params.nominal, params.total_id], (err, rows)=>{
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
            let newNominal = oldNominal - params.nominal

            let sql = `UPDATE total_cash SET nominal = nominal - ?, last_income = ?, last_update = now(), income_update_at = now() WHERE id = ?`
            connection.query(sql, [newNominal, params.nominal, params.total_id], (err, rows)=>{
                connection.release()
                if(!err){
                    res.send('Cash has be updated')
                    res.end()
                } else {
                    console.log(err)
                }
            })
        } 
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