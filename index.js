const express = require('express');
const cors = require('cors');
const app = express();
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cors());

// Dynamic Connection URI using Environment Variables
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.s52ddrv.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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
    // Connect the client to the server
    await client.connect();

    const db = client.db("zapShiftDB");
    const parcelsCollection = db.collection("parcels");
    const usersCollection = db.collection("users"); // 👈 Users Collection যোগ করা হলো

    // ==========================================
    // 👤 USERS RELATED APIS
    // ==========================================

    // 1. Create User in Database (Avoid duplicate user registration)
    app.post('/users', async (req, res) => {
      const user = req.body;
      
      // চেক করা ইউজার আগে থেকেই ডাটাবেজে আছে কি না
      const query = { email: user.email };
      const existingUser = await usersCollection.findOne(query);

      if (existingUser) {
        return res.send({ message: 'User already exists in database', insertedId: null });
      }

      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    // 2. Get All Users or single user by email
    app.get('/users', async (req, res) => {
      const email = req.query.email;
      let query = {};
      if (email) {
        query = { email: email };
      }
      const result = await usersCollection.find(query).toArray();
      res.send(result);
    });

    // 3. Get User Role (e.g., admin, user, deliveryman)
    app.get('/users/role/:email', async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      res.send({ role: user?.role || 'user' });
    });


    // ==========================================
    // 📦 PARCELS RELATED APIS
    // ==========================================

    // Parcels API - Get all parcels or filter by email
    app.get('/parcels', async (req, res) => {
      const query = {};
      const { email } = req.query;

      if (email) {
        query.senderEmail = email;
      }

      const cursor = parcelsCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    // Parcels API - Create a new parcel
    app.post('/parcels', async (req, res) => {
      const parcel = req.body;
      const result = await parcelsCollection.insertOne(parcel);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } catch (error) {
    console.error("MongoDB Connection Error:", error);
  }
}

run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Zap is shifting!');
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});