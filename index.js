const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const app = express();
const prisma = new PrismaClient();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cors());

// ==========================================
// 👤 USERS APIS
// ==========================================

// 1. Create User
app.post('/users', async (req, res) => {
  try {
    const { name, email, photoURL, role } = req.body;

    if (!email) {
      return res.status(400).send({ error: 'Email is required' });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.send({ message: 'User already exists in database', insertedId: null });
    }

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        photoURL,
        role: role || 'user',
      },
    });

    res.send({ insertedId: newUser.id, ...newUser });
  } catch (err) {
    console.error("Error creating user:", err);
    res.status(500).send({ error: err.message });
  }
});

// 2. Get All Users or single user by email
app.get('/users', async (req, res) => {
  try {
    const email = req.query.email;

    if (email) {
      const users = await prisma.user.findMany({
        where: { email },
      });
      return res.send(users);
    }

    const users = await prisma.user.findMany();
    res.send(users);
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});

// 3. Get User Role
app.get('/users/role/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const user = await prisma.user.findUnique({
      where: { email },
    });

    res.send({ role: user?.role || 'user' });
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});

// ==========================================
// 📦 PARCELS APIS
// ==========================================

// 1. Get All Parcels or filter by senderEmail
app.get('/parcels', async (req, res) => {
  try {
    const { email } = req.query;

    if (email) {
      const parcels = await prisma.parcel.findMany({
        where: { senderEmail: email },
      });
      return res.send(parcels);
    }

    const parcels = await prisma.parcel.findMany();
    res.send(parcels);
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});

// 2. Create a new Parcel
app.post('/parcels', async (req, res) => {
  try {
    const parcelData = req.body;
    const newParcel = await prisma.parcel.create({
      data: parcelData,
    });

    res.send({ insertedId: newParcel.id, ...newParcel });
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});

// Root Route
app.get('/', (req, res) => {
  res.send('Zap is shifting with Prisma!');
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});