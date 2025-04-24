require("dotenv").config()
const express = require("express")
const cors = require("cors")
const jwt = require("jsonwebtoken")
const cookieParser = require("cookie-parser")
const app = express()
const port = process.env.PORT || 3000
const secret = process.env.JWT_SECRET?process.env.JWT_SECRET:(()=>{throw new Error("jwt secret is not found")})()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const { send } = require("process")
const { error } = require("console")


// middleware-----------
app.use(cors({
  origin:"http://localhost:5173",
  credentials:true
}))
app.use(express.json())
app.use(cookieParser())




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.hhpkb.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
    
    // jwt related api
     app.post("/jwt",async (req,res)=>{
       const{ userEmail} = req.body
        if(!userEmail){
          return res.status(400).send({error:"email is required to generate token"})
        }
       const token = jwt.sign(userEmail,secret,{expiresIn:"1h"})
       res
       .cookie("token",token,{
        httpOnly:true,
        secure:false,
        sameSite:"lax"

       })
       .send({success:true})
     })

    // service related apis -------------
    const service_DB = client.db('service_DB')
    const serviceCollection = service_DB.collection("services")
    const collectionOfBookedServices = service_DB.collection("bookedServices")
    const  userCollection = service_DB.collection("usersInfo")

    app.get("/allData", async (req, res) => {
      let query = {}
      const email = req.query.email
      const serviceName = req.query.serviceName?.trim()
      if (email) {
        query = { providerEmail: email }
      }
      if(serviceName){
        query={
          serviceName:{$regex:serviceName,$options:"i"}
        }
      }

      const result = await serviceCollection.find(query).toArray()
      res.send(result)
    })
    app.get("/servicesForHomePage", async (req, res) => {
      const cursor = serviceCollection.find({}).sort({ _id: 1 }).limit(6)
      const result = await cursor.toArray()
      res.send(result)
    })
    app.get("/allData/:id", async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await serviceCollection.findOne(query)
      res.send(result)
   
    })

  

    app.post("/service", async (req, res) => {
      const newService = req.body;
      const result = await serviceCollection.insertOne(newService)
      res.send(result)
    })
    app.patch("/service/:id", async (req, res) => {
      const id = req.params.id
      const filter = { _id: new ObjectId(id) }
      const updateDoc = {
        $set: req.body

      }
      const result = await serviceCollection.updateOne(filter, updateDoc)
      res.send(result)
    })

    app.delete("/service/:id", async (req, res) => {
      const id = req.params.id
      const filter = { _id: new ObjectId(id) }
      const result = await serviceCollection.deleteOne(filter)
      res.send(result)
    })

    //  bookedService related API
      app.get("/allDataOfBookedServices",async(req,res)=>{
        let query = {}
        const email = req.query.email
        if(email){
          query={
            currentUserEmail:email
            
          }
        }
        const result = await collectionOfBookedServices.find(query).toArray()
        res.send(result)
      })

      app.get("/serviceToDo",async(req,res)=>{
        let query
            const email = req.query.email
            if(email){
             query={
                providerEmail:email
              }
            }
            const result = await collectionOfBookedServices.find(query).toArray()
            res.send(result)
      })
    app.post("/bookedServices", async (req, res) => {
      const bookedService = req.body;
      const result = await collectionOfBookedServices.insertOne(bookedService)
      res.send(result)
    })

    app.patch("/serviceToDo/:id",async (req,res)=>{
         const id = req.params.id
         const filter = {_id : new ObjectId(id)}
         const updateDoc={
          $set:req.body
         }
         const result = await collectionOfBookedServices.updateOne(filter,updateDoc)
         res.send(result)
    })

    // users related API--------------
    app.get("/userModeAndInfo",async(req,res)=>{
          let query = {}
          const email = req.query.email
          if(email){
            query={userEmail:email}
          }
          const result = await userCollection.find(query).toArray()
          res.send(result)
    })
    app.post("/users",async(req,res)=>{
          const data = req.body
          const filter = {userEmail:data.userEmail}
          const options={upsert:true}
          const updateDoc={
            $set:{
              userName:data.userName,
              userMode:data.userMode
            }
          }
           const result = await userCollection.updateOne(filter,updateDoc,options)
           res.send(result)
    })

  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get("/", (req, res) => {
  res.send("hello word")
})

app.listen(port, () => {
  console.log(`service master is running on port${port}`)
})


