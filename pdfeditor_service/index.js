const express = require("express");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const cors = require("cors");
require("dotenv").config();
require("./db");

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

app.use(helmet());
app.use(cors({ origin: true, credentials: true }));

// app.use(require("./auth"))

app.use("/",require("./routes/index.routes"));

//404 handler
app.use(require("./notFound"));

//Error Handler
app.use(require("./errorHandler"));


const PORT = process.env.PORT || 8000;

app.listen(PORT,() => console.log(`App running on the port ${PORT}`));

