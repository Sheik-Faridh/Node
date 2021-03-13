const express = require("express");
const route = express.Router();

route.use("/auth",require("./auth.routes"));

route.use("/api/v1/user",require("./users.routes"));

route.use("/api/v1/file",require("./files.routes"));

module.exports = route;