const express = require("express")
const cors = require("cors")
const app = express()
const port = 5000
const { MongoClient, ServerApiVersion } = require('mongodb');

// serviceMasterDB
// yRmWlErAuGHXTkxM

// middleware-----------
app.use(cors())
app.use(express.json())





const uri = `mongodb+srv://serviceMasterDB:yRmWlErAuGHXTkxM@cluster0.hhpkb.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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

    // service related apis -------------
     const service_DB =client.db('service_DB')
     const serviceCollection = service_DB.collection("services")

     app.get("/services", async (req,res)=>{
           const cursor =  serviceCollection.find({})
           const result =await cursor.toArray()
           res.send(result)
     })

     app.post("/service", async(req,res)=>{
        const newService = req.body;
        const result = await serviceCollection.insertOne(newService)
        res.send(result)
     })

  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get("/",(req,res)=>{
    res.send("hello word")
})

app.listen(port,()=>{
    console.log(`service master is running on port${port}`)
})