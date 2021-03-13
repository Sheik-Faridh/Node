const express = require("express");
const createError = require("http-errors");
const app = express.Router();
const { generateToken,encrypt,decrypt,generateAndSaveToken,revokeUserRefreshToken,getUserTokenToBeRevoked } = require("../helpers/token");
const { createUser,filterUserData,isUserExist } = require("../helpers/users");
const { userAuth,authForRegister,getUserDataForToken,authorize } = require("../helpers/auth");


const refreshTokenCookieConfig = {
    httpOnly: true, // to disable accessing cookie via client side js
    sameSite: "None",
    secure: true // to force https (if you use it)
    //maxAge: 604800, // ttl in seconds (remove this option and cookie will die when browser is closed)
    //signed: true // if you use the secret with cookieParser
}

const authCookieConfig = {
    httpOnly: true, // to disable accessing cookie via client side js
    sameSite: "None",
    secure: true // to force https (if you use it)
    //maxAge: 3600, // ttl in seconds (remove this option and cookie will die when browser is closed)
    //signed: true // if you use the secret with cookieParser
};

const generateJWT = async payload => {
    try{
        const user = await getUserDataForToken(payload);
        if(user){
            const payload = {
                name: "pdfeditor",
                user_id: user._id
            };
            const token = generateToken(payload);
            return { user,token };
        }else{
            throw createError(401,"User not registered");  
        }
    }catch(error){
        throw error;
    }
}

const sendJWTInCookie = async (req,res,next) => {
    try{
        const { user,token } = await generateJWT(req.body);
        const ipAddress = req.ip;
        const oldTokenData = await getUserTokenToBeRevoked(user._id);
        const newToken = await generateAndSaveToken(user._id,ipAddress);
        oldTokenData && await revokeUserRefreshToken(oldTokenData.token,newToken,ipAddress);
        res.cookie("refreshToken", newToken, refreshTokenCookieConfig);
        res.cookie("token", `Bearer ${token}`, authCookieConfig);
        res.header('Access-Control-Allow-Credentials', true);
        res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,UPDATE,OPTIONS');
        res.header('Access-Control-Allow-Headers', 'X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept');
        res.send(filterUserData(user));
    }catch(error){
        console.error(error);
        next(error);
    }
}

const sendJWTInHeader = async (req,res,next) => {
    try{
        const payload = {
            name: "pdfeditor",
            user_id: req.userId
        };
        const {placeHolder} = req.body;
        const token = generateToken(payload);
        if(placeHolder) res.header("Authorization", `Bearer ${token}`);
        else res.cookie("token", `Bearer ${token}`, authCookieConfig);
        res.send("Token generated successfully");
    }catch(error){
        next(error);
    }
}

const registerUser = async (req,res,next) => {
    try{
        const token = req.headers.authorization;
        const decryptedBody = decrypt(req.body.user);
        const userPayload = {
            user: decryptedBody
        };
        const result = await createUser(userPayload,token);
        res.status(201).send(result);
    }catch(error){
        next(error);
    }
}

const logOutUser = (req,res,next) => {
    try{
        res.status(200);
        res.clearCookie("token");
        res.send("User successfully logged out");
    }catch(error){
        console.error(error);
        next(createError(500,"Failed to logout the user"));
    }
}

const encryptData = (req,res,next) => {
    try{
        const encryptedData = encrypt(req.body);
        res.status(200);
        res.json(encryptedData);
    }catch(error){
        console.error(error);
        next(createError(500,"Failed to encrypt the data"));
    }
}

const sendRefreshToken = async (req,res,next) => {
    try{
        const { user_id } = req.params;
        const ipAddress = req.ip;
        await isUserExist({_id: user_id}, "_id");
        const oldTokenData = await getUserTokenToBeRevoked(user_id);
        const newToken = await generateAndSaveToken(user_id,ipAddress);
        oldTokenData && await revokeUserRefreshToken(oldTokenData.token,newToken,ipAddress);
        res.cookie("refreshToken",newToken, refreshTokenCookieConfig);
        res.send("Refresh Token generated successfully");
    }catch(error){
        next(error);
    }
}

const revokeRefreshToken = async (req,res,next) => {
    try{
        const token = req.body.token || req.cookies.refreshToken;
        const ipAddress = req.ip;
        const refreshToken = await revokeUserRefreshToken(token,null,ipAddress);
        if(!refreshToken)
            throw createError(404,"Refresh token not found");
        res.send("Token revoked successfully");
    }catch(error){
        next(error)
    }
}

app.post("/register", registerUser);

app.post("/authenticate", sendJWTInCookie);

app.post("/logout", userAuth, logOutUser);

app.post("/encrypt", authForRegister, encryptData);

app.post("/generate-token", authorize, sendJWTInHeader);

app.post("/users/:user_id/refresh-token", authForRegister, sendRefreshToken);

app.post("/revoke-token", userAuth, revokeRefreshToken);

module.exports = app;