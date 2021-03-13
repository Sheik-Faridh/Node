const express = require("express");
const app = express.Router();
const Ajv = require("ajv");
const axios = require("axios");
const createError = require("http-errors");
const ajv = new Ajv({allErrors: true, $data: true, schemaId: "auto", jsonPointers: true});
const { isUserExist,filterUserData,userSchemaForCreate,userSchemaForUpdate,isUserFound } = require("../helpers/users");
const { userAuth,authForRegister } = require("../helpers/auth");
const { getUserDetailsFromToken } = require("../helpers/token");
const { getErrorMessage } = require("../helpers/error");
require('ajv-errors')(ajv);
const User = require("../models/users.model");

const createUser = async (req,res,next) => {
    try{
        const { body } = req;
        const validate = ajv.compile(userSchemaForCreate);
        const valid = validate(body.user);
        if(!valid){
            const errors = getErrorMessage(validate.errors);
            next(createError(400,"Invalid JSON format",{errors}));
        }else if(!await isUserExist( body.user.email )){
           const user = new User({
               firstName: body.user.firstName,
               lastName: body.user.lastName,
               email: body.user.email,
               password: body.user.password
           });
           const result = await user.save();
           res.status(201).send(filterUserData(result));
        }else {
            next(createError(400,`${body.user.email} has already been registered`));
        }
    }catch(e){
        console.error(e);
        next(createError(500,"Failed to create a user"));
    }
}

const getUserByEmail = async(req,res,next) => {
    const { email } = req.query; 
    try{
        const user = await isUserFound({email: email},"email");
        res.status(200).send(user);
    }catch(e){
        next(e);
    }
}

const getUserById = async(req,res,next) => {
    try{
        const { id } = req.params; 
        const user = await isUserFound({_id:id},"_id");
        res.status(200).send(user);
    }catch(e){
        next(e);
    }
}

const getAllUsers = async (req,res,next) => {
    try{
        const allUsers = await User.find({},{
            firstName:1,
            lastName: 1,
            email: 1,
            updated_at: 1,
            created_at: 1
        });
        res.status(200).send(allUsers);
    }catch(e){
        console.error(e);
        next(createError(500,"Failed to get all the users"));
    }
}

const deleteUser = async (req,res,next) => {
    const { id } = req.params;
    try{
        const result = await User.findByIdAndDelete(id);
        if(result)
            res.status(204).send({
                message: "User deleted successfully"
            });
        else
            next(createError(404,"User Id not found"));
    }catch(e){
        console.error(e);
        next(createError(500,`Failed to delete the user ${id}`));
    }
}

const updateUser = async (req,res,next) => {
    const { id } = req.params;
    try{
        const { body } = req;
        const validate = ajv.compile(userSchemaForUpdate);
        const valid = validate(body.user);
        const option = { new: true };
        if(!valid){
            const errors = getErrorMessage(validate.errors);
            next(createError(400,"Invalid JSON format",{errors}));
        }else{
            const result = await User.findByIdAndUpdate(id,body.user,option);
            if(result){
                res.status(200);
                res.send(result);
            }else{
                next(createError(404,"User ID not found"));
            }
        }
    }catch(e){
        console.error(e);
        next(createError(500,`Failed to update the user ${id}`));
    }
}

const getLoggedInUserData = async (req,res,next) => {
    try{
        const auth = req.cookies.token || req.headers.authorization;
        const token = auth.split("Bearer ")[1];
        const user_id = getUserDetailsFromToken(token);
        const url = `${process.env.BASE_URL}/api/v1/user/${user_id}`;
        const config = {
            headers:{
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        };
        const result = await axios.get(url,config);
        res.send(result.data);
    }catch(error){
        next(error.response.data.error || error);
    }
}

app
    .get("/",userAuth,getUserByEmail)
    .get("/all",userAuth,getAllUsers)
    .get("/me",userAuth,getLoggedInUserData)
    .get("/:id",userAuth,getUserById)
    .post("/",authForRegister,createUser)
    .patch("/:id",userAuth,updateUser)
    .delete("/:id",userAuth,deleteUser)

module.exports = app;