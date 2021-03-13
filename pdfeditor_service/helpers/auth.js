const createError = require("http-errors");
const Ajv = require("ajv");
const ajv = new Ajv({allErrors: true, $data: true, schemaId: "auto", jsonPointers: true});
const { verifyToken,isValidRefreshToken,decrypt } = require("./token");
const { getErrorMessage } = require("../helpers/error");
const { validateUser } = require("../helpers/users");

const authSchema = {
    id: "/auth",  
    type: "object",  
    properties: {    
        userName: {      
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
    required: ["userName","password"],
    errorMessage: {
        type: "should be an object",
        properties: {
          userName: "UserName can be atmax 50 characters long",
          password: "Password must contain min 8 and max 16 characters, least 1 number and both lower and uppercase letters and special characters"
        }
    }
}

const basicAuth = auth => {
    if(!auth || auth.indexOf("Basic ") === -1)
            throw createError(401);

    const [userName,password] = Buffer.from(auth.split(" ")[1], 'base64').toString('ascii').split(":");
    if( userName !== process.env.AUTH_USERNAME)
        throw createError(400,"Invalid UserName");
    else if(password !== process.env.AUTH_PASSWORD)
        throw createError(400,"Invalid Password");
    else
        return true;
}

const getUserDataForToken = async payload => {
    try{
        const decryptedUserData = decrypt(payload);
        const validate = ajv.compile(authSchema);
        const valid = validate(decryptedUserData);
        if(!valid){
            const errors = getErrorMessage(validate.errors);
            throw createError(400,"Invalid JSON format",{errors});
        }
        return await validateUser(decryptedUserData);
    }catch(error){
        throw error;
    }
}

const authorize = async (req,res,next) => {
    try{
        if(req.body.userName && req.body.password){
            const payload = req.body;
            const user = await getUserDataForToken(payload);
            if(!user) throw createError(404,"User not found");
        }else{
            const token =  req.cookies.refreshToken;
            if(!token) throw createError(401);
            const tokenData = await isValidRefreshToken(token);
            req.userId = tokenData.userId;
        }
        next();
    }catch(error){
        next(error);
    }
}

const authForRegister = (req,res,next) => {
    try{
        const auth = req.headers.authorization;
        basicAuth(auth);
        next();
    }catch(error){
        next(error);
    }
}

const userAuth = (req,res,next) => {
    try{
        const auth = req.cookies.token || req.headers.authorization;
        
        if(!auth || auth.indexOf("Bearer ") === -1)
            throw createError(401,"Unauthorized request");
        
        const token = auth.split(" ")[1];
        verifyToken(token);
        next();
    }catch(error){
        next(error);
    }
}

module.exports = {
    authForRegister,
    userAuth,
    authSchema,
    authorize,
    getUserDataForToken
}
