const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const jwt = require('jsonwebtoken')
const port = process.env.PORT || 5000;
require('dotenv').config()


// middleware

app.use(cors({
  origin: ['http://localhost:5173'],
  credentials: true

}));
app.use(express.json())
app.use(cookieParser())


const uri = `mongodb+srv://${process.env.SET_USER}:${process.env.SET_PASS}@cluster0.23qqz48.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

const logger = async (req, res, next) => {
  console.log('called: ', req.host, req.originalUrl);
  next();
}

const verifyToken = async(req,res,next) =>{
  const token = req.cookies?.token;
  console.log('value of token middleware', token)
  if(!token){
    return res.status(401).send({message: 'not authorized'})
  }

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded)=>{
    // error
    if(err){
      console.log(err)
      return res.status(401).send({message: 'not authorized'})
    }
    // if token is valid it will be decoded
    console.log('value in the token', decoded)
    req.user = decoded;
    next()
  })


}

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();



    const CarDoctorCollection = client.db('carDoctorDB').collection('carDoctor');
    const orderBookingCollection = client.db('carDoctorDB').collection('orderBooking');
    const bookingServiceCollection = client.db('carDoctorDB').collection('bookingServices')


    // auth related API
    app.post('/jwt', logger, async (req, res) => {
      const user = req.body;
      console.log(user)
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
      res
        .cookie('token', token, {
          httpOnly: true,
          secure: false,
          sameSite: 'strict',
        })
        .send({ success: true })
    })




    // needed api
    app.get('/carDoctor',logger, async (req, res) => {
      const carDoctor = CarDoctorCollection.find();
      const result = await carDoctor.toArray();
      res.send(result)
    })


    app.get('/carDoctor/:id',logger, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await CarDoctorCollection.findOne(query)
      res.send(result)
    })








    // bookingPersonDetails
    app.get('/bookings', logger, async (req, res) => {
      const booking = orderBookingCollection.find();
      const result = await booking.toArray();
      res.send(result)
    })

    app.get('/bookings/:id', logger,async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await orderBookingCollection.findOne(query)
      res.send(result)
    })

    app.post('/bookings',logger, async (req, res) => {
      const booking = req.body;
      console.log(booking);
      const result = await orderBookingCollection.insertOne(booking);
      res.send(result); // Send the result back to the client
    });






    // booking Service Details:

    app.get('/bookingServices/:id',logger, verifyToken,async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await bookingServiceCollection.findOne(query)
      res.send(result)
    })


    app.get('/bookingServices', logger, verifyToken, async (req, res) => {
      console.log(req.query.email);
      // console.log('tok tok token', req.cookies.token)
      console.log('user in the valid token',req.user)
      let query = {};

      if(req.query.email !== req.user.email){
        return res.status(403).send({message: 'forbidden access'})
      }
      if (req.query?.email) {
        query = { email: req.query.email };
      }
      console.log(query)
      const result = await bookingServiceCollection.find(query).toArray();
      res.send(result);
    });



    app.post('/bookingServices', logger, async (req, res) => {
      const services = req.body;
      console.log(services);
      const result = await bookingServiceCollection.insertOne(services);
      res.send(result); // Send the result back to the client
    });

    app.patch('/bookingServices/:id', async (req, res) => {
      const id = req.params.id;
      const updateBooking = req.body;
      console.log(updateBooking);
      const filter = { _id: new ObjectId(id) };
      const updateUser = {
        $set: {
          status: updateBooking.status
        }
      };
      const result = await bookingServiceCollection.updateOne(filter, updateUser);
      res.send(result);
    })


    app.delete('/bookingServices/:id', async (req, res) => {
      const id = req.params.id;
      console.log('delete id:', id);
      const query = { _id: new ObjectId(id) };
      const result = await bookingServiceCollection.deleteOne(query);
      res.send(result)
    })













    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send("Car Doctor server is running")
})

app.listen(port, () => {
  console.log(`Car Doctor server is running on port: ${port}`)
})
