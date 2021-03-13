const jwt = require("jsonwebtoken");
const crypto = require('crypto');
const createError = require("http-errors");
const algorithm = 'aes-256-ctr';
const secretKey = process.env.SECRET_KEY;
const RefreshToken = require("../models/tokens.model");

const JWTOptions = {
    expiresIn: "1h",
    algorithm: "HS256"
}

const decode = payload => {
    try{
        const decodedPayload = {};
        const allowedProp = ["firstname","lastname","email","password","confirmpassword","username"];
        for(const key of Object.keys(payload)){
            if(allowedProp.includes(key.toLowerCase())){
                decodedPayload[key] = Buffer.from(payload[key], 'base64').toString('ascii');
            }else{
                throw createError(400,"Invalid Property");
            }
        }
        return decodedPayload;
    }catch(error){
        throw error;
    }
}

const encryptContent = text => {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, secretKey, iv);
    const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);
    return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
}

const decryptContent = content => {
    const contentParts = content.split(':');
    const iv = Buffer.from(contentParts.shift(), 'hex');
    const hash = Buffer.from(contentParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv(algorithm, secretKey, iv);
    const decrpyted = Buffer.concat([decipher.update(hash), decipher.final()]);
    return decrpyted.toString();
}

const encrypt = payload => {
    try{
        const encryptedData = {};
        for(const key of Object.keys(payload)){
            const encryptedText = encryptContent(payload[key]);
            encryptedData[key] = encryptedText;
        }
        return encryptedData;
    }catch(error){
        throw error;
    }
}

const decrypt = payload => {
    try{
        const decryptedData = {};
        for(const key of Object.keys(payload)){
            decryptedData[key] = decryptContent(payload[key]);
        }
        return decryptedData;
    }catch(error){
        throw error;
    }
}

const getUserDetailsFromToken = token => {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded.user_id;
}

const generateToken = payload => {
    try{
        return jwt.sign(payload, process.env.JWT_SECRET, JWTOptions);
    }catch(error){
        throw error;
    }
}

const verifyToken = token => {
    try{
        jwt.verify(token,  process.env.JWT_SECRET);
        return true;
    }catch(error){
        const { name } = error;
        switch(name){
            case "TokenExpiredError":
                throw createError(401,"Token Expired");
            case "JsonWebTokenError":
                throw createError(401,"JWT Malformed");
            case "NotBeforeError":
                throw createError(401,"JWT not active");
            default:
                throw createError(500,"Failed to verify the token");
        }
    }
}

const generateRefreshToken = () => crypto.randomBytes(40).toString('hex')

const generateAndSaveToken = async(user_id,ipAddress) => {
    try{
        const refresh_token = generateRefreshToken();
        const Token = new RefreshToken({
            userId: user_id,
            token: refresh_token,
            expires: new Date(Date.now() + 7*24*60*60*1000),
            createdIp: ipAddress
        });
        await Token.save();
        return refresh_token;
    }catch(error){
        console.error(error);
        throw new Error("failed to generate the refresh token");
    }
}

const revokeUserRefreshToken = async (token,newRefreshToken,ipAddress) => {
    try{
        const Token = await RefreshToken.findOne({
            token
        });
        if(Token){
            Token.revoked = Date.now();
            Token.revokedIp = ipAddress;
            if(newRefreshToken) Token.replacedByToken = newRefreshToken;
            return await Token.save();
        }
        return Token;
    }catch(error){
        console.error(error);
        throw new Error("Failed to revoke the token");
    }
}

const getUserTokenToBeRevoked = async user_id => {
    try{
        return await RefreshToken.findOne({
            userId: user_id,
            revoked: null
        });
    }catch(error){
        console.error(error);
        throw new Error("Failed to get the list of  user refresh token");
    }
}

const isValidRefreshToken = async token => {
    try{
        const Token = await RefreshToken.findOne({token});
        if(Token){
            if(Token.isExpired)
                throw createError(401,"Refresh Token Expired");
            else if(Token.revoke)
                throw createError(401, "Revoked token cannot be used");
            else
                return Token;
        }else{
            throw createError(401,"Invalid Refresh Token");
        }
    }catch(error){
        throw error;
    }
}

module.exports = {
    generateToken,
    verifyToken,
    encrypt,
    decrypt,
    decode,
    getUserDetailsFromToken,
    generateAndSaveToken,
    revokeUserRefreshToken,
    getUserTokenToBeRevoked,
    isValidRefreshToken
}