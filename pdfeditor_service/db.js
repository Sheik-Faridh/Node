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

// MongoDB Atlas
// dbname -pdfeditor
// mongodb+srv://editor:<password>@cluster0.e53zz.mongodb.net/<dbname>?retryWrites=true&w=majority
// username - editor
// password- xBzk7m4fRym3P4vp

// mongodb+srv://editor:aq41o0Qa1VsxyGg8@pdfcluster.mystc.mongodb.net/pdfeditordb
// username - editor
// new password - aq41o0Qa1VsxyGg8

mongoose.connect("mongodb+srv://pdfcluster.mystc.mongodb.net",config).then(() => console.log("MongoDB connected successfully"))

mongoose.connection.on("error", err => console.log("Mongoose Connection Error",err.message))

mongoose.connection.on("disconnected", () => console.log("Mongoose Connection disconnected"))

process.on("SIGINT",async () => {
    await mongoose.connection.close();
    process.exit(0);
})


