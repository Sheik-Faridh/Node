const mongoose = require("mongoose");
const { Schema } = mongoose;

const schemaOptions = {
    timestamps: {
        createdAt: "uploaded_at",
        updatedAt: "updated_at"
    }
}

const FileSchema = new Schema({
    name:{
        type: String,
        required: true,
        unique: true
    },
    size:{
        type: Number,
        required: true
    },
    createdBy:{
        type: String,
        required: true
    },
    updatedBy: {
        type: String,
        required: true
    },
    original: {
        type: Boolean,
        required: true
    },
    gid: {
        type: String,
        required: true
    },
    currentFileId: {
        type: String,
        required: false
    },
    parentFileId: {
        type: String,
        required: false
    },
    folderId: {
        type: String,
        required: true
    }
},schemaOptions);

module.exports = mongoose.model("File",FileSchema);