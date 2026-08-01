const mongoose = require('mongoose')


const cardSchema = new mongoose.Schema({
    title:{
        type:String,
    },
    value:{
        type:String
    }
})


const Card = mongoose.models.Card || mongoose.model("Card",cardSchema)


module.exports= Card;