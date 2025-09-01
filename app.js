const express = require("express");
require("dotenv").config();
const sequelize = require("./config/db");
const responseMessages = require("./middlewares/response.middleware");
const handleNotFound = require("./middlewares/notFound.middleware");
const errorHandler = require("./middlewares/errorHandler.middleware");
require("./models");

const app = express();
const port = process.env.APP_PORT;
const baseUrl = process.env.BASE_URL;

app.use(express.json());
app.use(express.urlencoded({extended: true,}));
app.use(responseMessages);


// const authRoutes = require("./routes/auth.routes");
const adminRoutes = require("./routes/admin.routes");
const userRoutes = require("./routes/user.routes");
const inventoryRoutes = require("./routes/inventory.routes");
const bookingRoutes = require("./routes/booking.routes");


app.use("/api/admin", adminRoutes);
app.use("/api/user", userRoutes);
app.use("/api/inventory",inventoryRoutes);
app.use("/api/booking",bookingRoutes);

//middlewares
app.use(handleNotFound);
app.use(errorHandler);

async function startServer() {
  try {
    await sequelize.authenticate();
    console.log("Database connection establish successfully");

    //for any schema changes
    await sequelize.sync({ alter: true });

    app.listen(port, () => {
      console.log(`Server running at :${baseUrl}`);
    });
  } catch (err) {
    console.log("Unable to connect to the Database :", err);
  }
}

startServer();
