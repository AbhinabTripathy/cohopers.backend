const express = require("express");
require("dotenv").config();
const sequelize = require("./config/db");
const sendResponse = require("./middlewares/response.middleware");
const handleNotFound = require("./middlewares/notFound,middleware");
const errorHandler = require("./middlewares/errorHandler.middleware");
require("./models");

const app = express();
const port = process.env.APP_PORT;
const baseUrl = process.env.BASE_URL;

app.use(express.json());
app.use(express.urlencoded({extended: true,}));

// Comment out or remove this line if you don't need auth routes yet
// const authRoutes = require("./routes/auth.routes");
const adminRoutes = require("./routes/admin.routes");
const inventoryRoutes = require("./routes/inventory.routes");
// Comment out or remove this line if you don't need auth routes yet
// app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/inventory",inventoryRoutes);

//middlewares
app.use(sendResponse);
app.use(handleNotFound);
app.use(errorHandler);

async function startServer() {
  try {
    await sequelize.authenticate();
    console.log("Database connection establish successfully");

    //for any schema changes
    await sequelize.sync({ alter: false });

    app.listen(port, () => {
      console.log(`Server running at :${baseUrl}`);
    });
  } catch (err) {
    console.log("Unable to connect to the Database :", err);
  }
}

startServer();
