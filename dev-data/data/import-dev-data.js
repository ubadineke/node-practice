const fs = require('fs')
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Tour = require('./../../models/tourModel.js')

dotenv.config({ path: './config.env' })

const DB = process.env.DATABASE.replace('<PASSWORD>', process.env.DATABASE_PASSWORD);

mongoose.connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false
}).then(con => {
    //console.log(con.connections);
    console.log('DB connection successful!')
})

//READ JSON FILE
const tours = JSON.parse(fs.readFileSync(`${__dirname}/tours-simple.json`, 'utf-8'))

//IMPORT DATA FROM DB
const importData = async () => {
    try{
        await Tour.create(tours)
        console.log('Data successfully loaded')
    } catch (err){
        console.log(err)
    }process.exit();
   
}

//DELETE ALLDATA FROM DB
const deleteData = async() => {
    try{
        await Tour.deleteMany();
        console.log('Data successfully deleted')
    } catch(err){
        console.log(err)
    } process.exit();
}

//deleteData();
importData();
