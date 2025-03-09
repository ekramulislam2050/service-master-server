const express = require("express")
const app = express()
const port = 5000

app.get("/",(req,res)=>{
    res.send("hello word")
})

app.listen(port,()=>{
    console.log(`service master is running on port${port}`)
})