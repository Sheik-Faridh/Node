const File = require("../models/files.model");
const createError = require("http-errors");
const fs = require("fs");
const path = require("path");

const filterFileData = fileRes => {
    const file = {};
    const allowedProps = ["name","size","createdBy","updatedBy","_id"];
    for(const key of Object.keys(fileRes._doc)){
        if(allowedProps.includes(key))
            file[key] = fileRes[key];
    }
    return file;
}

const isFileNameExist = async name => {
    try{
        const file = await File.find({name});
        return file && file.length ? true : false;
    }catch(error){
        console.error(error);
        throw createError(500,"failed to access the file");
    }
}

const isFileExist = async id => {
    try{
        const file = await File.find({_id: id});
        return file;
    }catch(error){
        throw error;
    }
}

const isFileValid = (req,res,next) => {
    try{
        if(!req.file)
            throw createError(400,"No File Uploaded");
            
        const { mimetype,size,originalname } = req.file;
        if(mimetype !== "application/pdf" && originalname.split(".").pop() !== "pdf")
            throw createError(400,"Invalid file format. File uploads support only PDF file");

        if(size > 5000000)
            throw createError(413,"Maximum of 5 MB can be uploaded");

        next();
    }catch(error){
        fs.unlinkSync(path.join(process.cwd(),req.file.path));
        next(error);
    }
}

const updateParentCurrentId = async (driveId,id,user_id) => {
    try{
        const option = { new: true };
        const body = {
            currentFileId: driveId,
            updatedBy: user_id
        };
        const result = await File.findByIdAndUpdate(id,body,option);
        if(!result)
            throw createError(500,"Failed to update the file");
        else
            return result;
    }catch(error){
        console.error(error);
        throw error;
    }
}

module.exports = {
    filterFileData,
    isFileNameExist,
    isFileValid,
    isFileExist,
    updateParentCurrentId
}