const User = require("../models/users.model");
const createError = require("http-errors");
const axios = require("axios");
const { axiosErrorHandler } = require("./error");

const userSchemaForUpdate = {
    id: "/user",  
    type: "object",  
    properties: {    
        firstName: { 
            type: "string",
            maxLength: 15,
            minLength: 1
        },  
        lastName: { 
            type: "string",
            maxLength: 15,
            minLength: 1
        },
        email: {      
            type: "string",      
            format: "email",
            maxLength: 50,
            minLength: 4
        },    
        password: { 
            type: "string",
            pattern: "^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).{8,16}$"
        }
    },  
    required: [],
    errorMessage: {
        type: "should be an object",
        properties: {
          firstName: "FirstName can be atmax 15 characters long",
          lastName: "LastName can be atmax 15 characters long",
          email: "Email can be atmax 50 characters long",
          password: "Password must contain min 8 and max 16 characters, least 1 number and both lower and uppercase letters and special characters"
        }
    }
}

const userSchemaForCreate = {
    id: "/user",  
    type: "object",  
    properties: {    
        firstName: { 
            type: "string",
            maxLength: 15,
            minLength: 1
        },  
        lastName: { 
            type: "string",
            maxLength: 15,
            minLength: 1
        },
        email: {      
            type: "string",      
            format: "email",
            maxLength: 50,
            minLength: 4
        },    
        password: { 
            type: "string",
            pattern: "^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).{8,16}$"
        },
        confirmPassword: { 
            const: {
                $data: "1/password"
            }
        }
    },  
    required: ["firstName","lastName","email","password","confirmPassword"],
    errorMessage: {
        type: "should be an object",
        properties: {
          firstName: "FirstName can be atmax 15 characters long",
          lastName: "LastName can be atmax 15 characters long",
          email: "Email can be atmax 50 characters long",
          password: "Password must contain min 8 and max 16 characters, least 1 number and both lower and uppercase letters and special characters",
          confirmPassword: "Confirm Password does not match with Password"
        },
        required:{
            firstName: "FirstName is missing",
            lastName: "LastName is missing",
            email: "Email is missing",
            password: "Password is missing",
            confirmPassword: "Confirm Password is missing"  
        }
    }
}

const isUserExist = async email => {
    try{
        const user = await User.find({email});
        return user && user.length ? true : false;
    }catch(error){
        console.error(error);
        throw error;
    }
}

const validateUser = async ({userName,password}) => {
    try{
        const user = await User.findOne({email:userName});
        if(!user) throw createError(404,`${userName} is not registered`);

        const isPasswordMatch = await user.isValidPassword(password);
        if(!isPasswordMatch)
            throw createError(400,"Invalid UserName/Password");

        return user;
    }catch(error){
        console.error(error);
        throw error;
    }
}

const createUser = async (data,token) => {
    try{
        const url = `${process.env.BASE_URL}/api/v1/user`;
        const config = {
            headers: {
                Authorization: token
            }
        }
        const res = await axios.post(url,data,config);
        return res.data;
    }catch(error){
        throw axiosErrorHandler(error);
    }
} 

const filterUserData = userRes => {
    const user = {};
    const allowedProps = ["firstName","lastName","email","updated_at","created_at","_id"];
    for(const key of Object.keys(userRes._doc)){
        if(allowedProps.includes(key))
            user[key] = userRes[key];
    }
    return user;
}

const isUserFound = async (obj,prop) => {
    try{

        const userData = await User.find(obj,{
            firstName:1,
            lastName: 1,
            email: 1,
            updated_at: 1,
            created_at: 1
        });
        if(userData && userData.length)
            return userData[0];
        throw createError(404,`User Not found ${prop}: ${obj[prop]}`);
    }catch(error){
        throw error;
    }
}

module.exports = {
    isUserExist,
    validateUser,
    createUser,
    userSchemaForCreate,
    userSchemaForUpdate,
    filterUserData,
    isUserFound
}