const mongoose = require("mongoose");
const { Schema } = mongoose;

const schemaOptions = {
    timestamps: {
        createdAt: "created_at"
    }
}

const UserTokenSchema = new Schema({
    token:{
        type: String,
        required: true,
        unique: true
    },
    expires:{
        type: Date,
        required: true
    },
    userId: {
        type: String,
        required: true
    },
    createdIp: {
        type: String,
        required: true
    },
    revoked: {
        type: Date,
        required: false
    },
    revokedIp: {
        type: String,
        required: false
    },
    replacedByToken: {
        type: String,
        required: false
    }
},schemaOptions);

UserTokenSchema.virtual('isExpired').get(function () {
    return Date.now() >= this.expires;
});

UserTokenSchema.virtual('isActive').get(function () {
    return !this.revoked && !this.isExpired;
});

UserTokenSchema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform: function (doc, ret) {
        // remove these props when object is serialized
        delete ret._id;
        delete ret.userId;
    }
});

module.exports = mongoose.model("Token",UserTokenSchema);