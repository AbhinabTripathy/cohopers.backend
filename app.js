const express = require("express");
require("dotenv").config();
const sequelize = require("./config/db");
const responseMessages = require("./middlewares/response.middleware");
const handleNotFound = require("./middlewares/notFound.middleware");
const errorHandler = require("./middlewares/errorHandler.middleware");
const seedMeetingRooms = require('./seeders/meetingRoom.seeder');
const seedSpaces = require('./seeders/seedSpaces');
const path = require('path');

require("./models");
const cors =require("cors");

const app = express();
const port = process.env.APP_PORT;
const baseUrl = process.env.BASE_URL;

// CORS configuration .................
app.use(cors({
  origin: '*', // Allow all origins, or specify allowed origins
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));    


app.use(express.json());
app.use(express.urlencoded({extended: false,}));
app.use(responseMessages);
// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const adminRoutes = require("./routes/admin.routes");
const userRoutes = require("./routes/user.routes");
const spaceRoutes = require("./routes/inventory.routes");
const bookingRoutes = require("./routes/booking.routes");
const meetingRoomRoutes = require("./routes/meetingRoom.routes");
const cafeteriaRoutes = require("./routes/cafeteria.routes"); 


app.use("/api/admin", adminRoutes);
app.use("/api/user", userRoutes);
app.use("/api/spaces",spaceRoutes);
app.use("/api/booking",bookingRoutes);
app.use("/api/meetingrooms",meetingRoomRoutes);
app.use("/api/cafeteria", cafeteriaRoutes); 

//middlewares
app.use(handleNotFound);
app.use(errorHandler);

async function startServer() {
  try {
    // First, authenticate the database connection
    await sequelize.authenticate();
    console.log("Database connection establish successfully");

    //for any schema changes
    await sequelize.sync({ alter: false });
    console.log('All models were synchronized successfully.');

    // Now run the seeders after tables are created
    console.log('Starting to seed meeting rooms...');
    await seedMeetingRooms();
    console.log('Finished seeding meeting rooms.');
    
    // Seed spaces
    console.log('Starting to seed spaces...');
    await seedSpaces();
    console.log('Finished seeding spaces.');
    
    app.listen(port, () => {
      console.log(`Server running at :${baseUrl}`);
    });
  } catch (err) {
    console.log("Unable to connect to the Database :", err);
  }
}

startServer();
