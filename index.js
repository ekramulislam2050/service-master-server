require("dotenv").config()
const express = require("express")
const cors = require("cors")

const app = express()
const port = process.env.PORT || 3000
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');


// middleware-----------
app.use(cors())
app.use(express.json())





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

    // service related apis -------------
    const service_DB = client.db('service_DB')
    const serviceCollection = service_DB.collection("services")
    const collectionOfBookedServices = service_DB.collection("bookedServices")


    app.get("/allData", async (req, res) => {
      let query = {}
      const email = req.query.email
      if (email) {
        query = { providerEmail: email }
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
      // console.log(id)
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


