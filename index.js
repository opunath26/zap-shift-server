const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const app = express();
const prisma = new PrismaClient();
const port = process.env.PORT || 3000;

// 1. CORS Configuration
app.use(
  cors({
    origin: [
      'http://localhost:5173',
      'http://localhost:5174',
      process.env.CLIENT_URL,
    ].filter(Boolean),
    credentials: true,
  })
);

// Middleware
app.use(express.json());
app.use(cookieParser());

// Verify JWT Middleware
const verifyToken = (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).send({ message: 'Unauthorized access' });
  }

  jwt.verify(
    token,
    process.env.ACCESS_TOKEN_SECRET || 'secret_key',
    (err, decoded) => {
      if (err) {
        return res.status(401).send({ message: 'Unauthorized access' });
      }
      req.user = decoded;
      next();
    }
  );
};

// ==========================================
//  AUTH / JWT APIS
// ==========================================

// Issue JWT Token
app.post('/jwt', async (req, res) => {
  try {
    const user = req.body;
    const token = jwt.sign(
      user,
      process.env.ACCESS_TOKEN_SECRET || 'secret_key',
      { expiresIn: '7d' }
    );

    res
      .cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
      })
      .send({ success: true });
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});

// Clear Cookie on Logout
app.post('/logout', (req, res) => {
  res
    .clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
    })
    .send({ success: true });
});

// ==========================================
//  USERS APIS
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
      return res.send({
        message: 'User already exists in database',
        insertedId: null,
      });
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
    console.error('Error creating user:', err);
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

// 4. Update User Role & Rider Details
app.patch('/users/role/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const { role, riderDetails } = req.body;

    if (!role) {
      return res.status(400).send({ error: 'Role is required' });
    }

    const updateData = { role };

    // Attach rider application data if present
    if (riderDetails) {
      updateData.phone = riderDetails.phone;
      updateData.nid = riderDetails.nid;
      updateData.license = riderDetails.license;
      updateData.region = riderDetails.region;
      updateData.district = riderDetails.district;
      updateData.bikeModel = riderDetails.bikeModel;
      updateData.bikeRegNo = riderDetails.bikeRegNo;
      updateData.about = riderDetails.about;
    }

    const updatedUser = await prisma.user.update({
      where: { email },
      data: updateData,
    });

    res.send(updatedUser);
  } catch (err) {
    console.error('Error updating user role:', err);
    res.status(500).send({ error: err.message });
  }
});

// ==========================================
//  PARCELS APIS
// ==========================================

// 1. Get All Parcels or filter by senderEmail
app.get('/parcels', async (req, res) => {
  try {
    const { email } = req.query;

    if (email) {
      const parcels = await prisma.parcel.findMany({
        where: { senderEmail: email },
        orderBy: { bookingDate: 'desc' },
      });
      return res.send(parcels);
    }

    const parcels = await prisma.parcel.findMany({
      orderBy: { bookingDate: 'desc' },
    });
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
      data: {
        senderName: parcelData.senderName,
        senderEmail: parcelData.senderEmail,
        senderPhone: parcelData.senderPhone || parcelData.senderPhoneNo,
        senderAddress: parcelData.senderAddress,

        receiverName: parcelData.receiverName,
        receiverPhone:
          parcelData.receiverPhone || parcelData.receiverContactNo,
        receiverAddress: parcelData.receiverAddress,

        parcelType: parcelData.parcelType,
        parcelWeight: parseFloat(parcelData.parcelWeight) || 0,
        cost: parseFloat(parcelData.cost) || 0,

        status: parcelData.status || 'pending',
        bookingDate: parcelData.bookingDate
          ? new Date(parcelData.bookingDate)
          : new Date(),
      },
    });

    res.send({ insertedId: newParcel.id, ...newParcel });
  } catch (err) {
    console.error('Error creating parcel:', err);
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