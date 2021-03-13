const mongoose = require("mongoose");

const config = {
    dbName:  process.env.DB_NAME,
    user: process.env.DB_USERNAME,
    pass: process.env.DB_PASSWORD,
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
    useFindAndModify: false
};

mongoose.connect("mongodb+srv://pdfcluster.mystc.mongodb.net",config).then(() => console.log("MongoDB connected successfully"))

mongoose.connection.on("error", err => console.log("Mongoose Connection Error",err.message))

mongoose.connection.on("disconnected", () => console.log("Mongoose Connection disconnected"))

process.on("SIGINT",async () => {
    await mongoose.connection.close();
    process.exit(0);
})


