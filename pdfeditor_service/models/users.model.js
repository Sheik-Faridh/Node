const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const { Schema } = mongoose;

const schemaOptions = {
    timestamps: {
        createdAt: "created_at",
        updatedAt: "updated_at"
    }
}

const UserSchema = new Schema({
    firstName:{
        type: String,
        required: true
    },
    lastName:{
        type: String,
        required: true
    },
    email:{
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    }
},schemaOptions);

UserSchema.pre("save",async function (next) {
    try{
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(this.password,salt);
        this.password = hashedPassword;
        next();
    }catch(error){
        next(error);
    }
})

UserSchema.methods.isValidPassword = async function(password) {
    try{
        return await bcrypt.compare(password,this.password);
    }catch(error){
        throw error;
    }
}

module.exports = mongoose.model("User",UserSchema);