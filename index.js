require("dotenv").config()
const express = require("express")
const cors = require("cors")
const jwt = require("jsonwebtoken")
const cookieParser = require("cookie-parser")
const app = express()
const port = process.env.PORT || 3000

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET ? process.env.ACCESS_TOKEN_SECRET : (() => { throw new Error("ACCESS_TOKEN_SECRET is not found") })()

const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET ? process.env.REFRESH_TOKEN_SECRET : (() => { throw new Error("REFRESH_TOKEN_SECRET is not found") })()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');




// middleware-----------
app.use(cors({
  origin:[ 
    "http://localhost:5173",
    "https://service-master-1db71.web.app",
    "https://service-master-1db71.firebaseapp.com"
    ],
  credentials: true
}))
app.use(express.json())
app.use(cookieParser())

// token generator----------
const accessTokenGenerator = (email) => {
  const accessToken = jwt.sign({ email }, ACCESS_TOKEN_SECRET, { expiresIn: "1h" })
  console.log("accessToken=>", accessToken)
  return accessToken
}
const refreshTokenGenerator = (email) => {
  const refreshToken = jwt.sign({ email }, REFRESH_TOKEN_SECRET, { expiresIn: "1d" })
  console.log("refreshToken", refreshToken)
  return refreshToken
}

// verifyToken----------------
const verifyToken = (req, res, next) => {
  const accessToken = req.cookies.accessToken
  if (!accessToken) {
    return res.status(401).send({ error: "unauthorize access" })
  }
  jwt.verify(accessToken, ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).send({ error: "forbidden access" })
    }
    req.user = decoded
    next()
  })

}


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
    // await client.connect();
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");

    // jwt related api
    app.post("/jwt", async (req, res) => {
      const { email } = req.body
      if (!email) {
        return res.status(400).send({ error: "email is required to generate token" })
      }
      
      try {

        const accessToken=accessTokenGenerator(email)
        const refreshToken=refreshTokenGenerator(email)
        res
        .cookie("accessToken", accessToken, {
          httpOnly: true,
          secure:process.env.NODE_ENV === "production",
          sameSite:process.env.NODE_ENV === "production" ? "none":"strict"

        })
        .cookie("refreshToken", refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production" ,
          sameSite: process.env.NODE_ENV === "production" ? "none":"strict"
        })
        .send({ success: true })
      }
      catch (err) {
        console.log("jwt error =>", err.message)
      }
      
    })

    app.post("/refreshToken", async (req, res) => {
      const refreshToken = req?.cookies?.refreshToken
      if (!refreshToken) {
        return res.status(401).send({ error: "refresh token is unauthorize access" })
      }
      jwt.verify(refreshToken, REFRESH_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(403).send({ error: "forbidden access" })
        }
        const email = decoded.email
        const newAccessToken=accessTokenGenerator(email)
        res
        .cookie("accessToken",newAccessToken,{
          httpOnly:true,
          secure:process.env.NODE_ENV === "production",
          sameSite:process.env.NODE_ENV === "production" ? "none" : "strict"
        })
        .send({success:true})
      })
    })
    
     app.post("/logOut",async (req,res)=>{
            const {email} = req.body
            console.log(email)
            if(!email){
              return res.status(400).send({error:"user data is missing"})
            }
            res
            .clearCookie('accessToken',{
              httpOnly:true,
              secure:process.env.NODE_ENV === "production",
              sameSite:process.env.NODE_ENV === "production"?"none":"strict"
            })
            .clearCookie("refreshToken",{
              httpOnly:true,
              secure:process.env.NODE_ENV === "production",
              sameSite:process.env.NODE_ENV === "production"?"none":"strict"
            })
            .send({success:true})
     })

    // service related apis -------------
    const service_DB = client.db('service_DB')
    const serviceCollection = service_DB.collection("services")
    const collectionOfBookedServices = service_DB.collection("bookedServices")
    const userCollection = service_DB.collection("usersInfo")

    app.get("/allData", verifyToken, async (req, res) => {

      const result = await serviceCollection.find({}).toArray()
      console.log(result)
      res.send(result)
    })

    app.get("/allDataGetByEmail", verifyToken, async (req, res) => {
      let query = {}
      const email = req.query.email
      console.log("email=>", email)
      if (email) {
        query.providerEmail = email
      }
      const result = await serviceCollection.find(query).toArray()

      console.log(result)
      res.send(result)
    })

    app.get("/allDataGetByServiceName", verifyToken, async (req, res) => {
      let query = {}
      let serviceName = req.query.serviceName
      console.log("serviceName=>", serviceName)
      if (serviceName) {
        serviceName = serviceName.trim()
      }

      if (serviceName) {
        query.serviceName = { $regex: serviceName, $options: "i" }

      }

      const result = await serviceCollection.find(query).toArray()
      console.log(result)
      res.send(result)
    })

    app.get("/servicesForHomePage", async (req, res) => {
      const cursor = serviceCollection.find({}).sort({ _id: 1 }).limit(6)
      const result = await cursor.toArray()
      res.send(result)
    })

    app.get("/allData/:id", verifyToken, async (req, res) => {
      const id = req.params.id
      console.log(id)
      const query = { _id: new ObjectId(id) }
      const result = await serviceCollection.findOne(query)
      console.log(result)
      res.send(result)

    })



    app.post("/service", verifyToken, async (req, res) => {
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
    app.get("/allDataOfBookedServices", async (req, res) => {
      let query = {}
      const email = req.query.email
      if (email) {
        query = {
          currentUserEmail: email

        }
      }
      const result = await collectionOfBookedServices.find(query).toArray()
      res.send(result)
    })

    app.get("/serviceToDo", async (req, res) => {
      let query
      const email = req.query.email
      if (email) {
        query = {
          providerEmail: email
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

    app.patch("/serviceToDo/:id", async (req, res) => {
      const id = req.params.id
      const filter = { _id: new ObjectId(id) }
      const updateDoc = {
        $set: req.body
      }
      const result = await collectionOfBookedServices.updateOne(filter, updateDoc)
      res.send(result)
    })

    // users related API--------------
    app.get("/userModeAndInfo", async (req, res) => {
      let query = {}
      const email = req.query.email
      if (email) {
        query = { userEmail: email }
      }
      const result = await userCollection.find(query).toArray()
      res.send(result)
    })
    app.post("/users", async (req, res) => {
      const data = req.body
      const filter = { userEmail: data.userEmail }
      const options = { upsert: true }
      const updateDoc = {
        $set: {
          userName: data.userName,
          userMode: data.userMode
        }
      }
      const result = await userCollection.updateOne(filter, updateDoc, options)
      res.send(result)
    })

    // pagination-------------
    app.get('/serviceCount',async(req,res)=>{
      const totalItems = await serviceCollection.estimatedDocumentCount()
      res.send({totalItems})
    })
    app.get("/allDataForPagination",async(req,res)=>{
         const currentPage = parseInt(req.query.currentPage)
         const itemsPerPage = parseInt(req.query.itemsPerPage)
         const result = await serviceCollection.find({}).skip((currentPage-1) * itemsPerPage).limit(itemsPerPage).toArray()
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


