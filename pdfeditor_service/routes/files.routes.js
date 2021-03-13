const express = require("express");
const app = express.Router();
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const createError = require("http-errors");
const { userAuth } = require("../helpers/auth");
const { getUserDetailsFromToken } = require("../helpers/token");
const { uploadFileToDrive,createFolderInDrive,getDriveFile,deleteFile } = require("../helpers/drive");
const { filterFileData,isFileNameExist,isFileValid,isFileExist,updateParentCurrentId } = require("../helpers/files");
const File = require("../models/files.model");

// Set Multer DiskStorage Destination
const upload = multer({ dest: 'uploads/' }).single('file')

const getAllFiles = async(req,res,next) => {
    try{
        const file = await File.find({
            original: true
        }, {
            name: 1,
            size: 1,
            updatedBy: 1,
            createdBy: 1
        });
        res.send(file);
    }catch(error){
        console.error(error);
        next(createError(500,"Failed to get all the files"));
    }
}

const getFile = async(req,res,next) => {
    try{
        const { id } = req.params; 
        const file = await isFileExist(id);
        if(file && file.length){
            const { currentFileId,name } = file[0];
            const filepath = await getDriveFile(currentFileId); 
            const streamData = fs.createReadStream(filepath);  
            res.setHeader('Content-disposition', 'inline; filename="' +  encodeURIComponent(name) + '"');
            res.setHeader('Content-type', 'application/pdf');
            streamData
                .on('end', () => fs.unlinkSync(filepath))
                .pipe(res);
        }else{
            throw createError(404,`File not found: ${id}`);
        }
    }catch(error){
        console.error(error);
        next(error);
    }
}

const getFileHistory = async(req,res,next) => {
    try{
        const { id } = req.params; 
        const file = await isFileExist(id);
        if(file && file.length){
            const { _id } = file[0];
            const fileHistory = await File.find({
                parentFileId: _id
            }, {
                name: 1,
                size: 1,
                updatedBy: 1,
                createdBy: 1
            });
            res.send(fileHistory);
        }else{
            throw createError(404,`File not found: ${id}`);
        }
    }catch(error){
        console.error(error);
        next(error);
    }
}

const uploadFile = async(req,res,next) => {
    try{
        const { originalname,size } = req.file;
        if(! await isFileNameExist(originalname)){
            const auth = req.cookies.token || req.headers.authorization;
            const token = auth.split("Bearer ")[1];
            const folderName = originalname.split(".")[0];
            const folderId = await createFolderInDrive(folderName);
            const gid = await uploadFileToDrive(req.file,originalname,folderId);
            const user_id = getUserDetailsFromToken(token);
            const file = new File({
                name: originalname,
                size: size,
                createdBy: user_id,
                updatedBy: user_id,
                original: true,
                gid: gid,
                currentFileId: gid,
                folderId: folderId 
            })
            const result = await file.save();
            res.status(201).send(filterFileData(result));
        }else{
            throw createError(400,`File ${originalname} already exist. Use different name`);
        }
    }catch(error){
        console.error(error);
        next(error);
    }finally{
        fs.unlinkSync(path.join(process.cwd(),req.file.path));
    }
}

const updateFile = async (req,res,next) => {
    try{
        const { id } = req.params; 
        const file = await isFileExist(id);
        if(file && file.length){
            const { originalname,size,filename } = req.file;
            const auth = req.cookies.token || req.headers.authorization;
            const token = auth.split("Bearer ")[1];
            const [fileName] = originalname.split(".pdf");
            const newFileName = `${fileName}_${filename}.pdf`;
            const { folderId } = file[0];
            const gid = await uploadFileToDrive(req.file,newFileName,folderId);
            const user_id = getUserDetailsFromToken(token);
            const childFile = new File({
                name: newFileName,
                size: size,
                createdBy: user_id,
                updatedBy: user_id,
                original: false,
                gid: gid,
                parentFileId: id,
                folderId: folderId
            })
            const result = await Promise.all([childFile.save(),updateParentCurrentId(gid,id,user_id)]);
            res.status(201).send(filterFileData(result[1]));
        }else{
            throw createError(404,`File not found: ${id}`);
        }
    }catch(error){
        console.error(error);
        next(error);
    }finally{
        fs.unlinkSync(path.join(process.cwd(),req.file.path));
    }
}

const deletePDFFile = async(req,res,next) => {
    try{
        const { id } = req.params;
        const file = await isFileExist(id);
        if(file && file.length){
            const ids = await deleteFile(file[0]);
            await File.deleteMany({ _id: { $in: ids }});
            res.status(204).send("file deleted successfully");
        }else
            throw createError(404,`File not found: ${id}`);
    }catch(error){
        next(error);
    }
}

app
    .get("/all", userAuth, getAllFiles)
    .get("/:id", userAuth, getFile)
    .get("/:id/history", userAuth, getFileHistory)
    .post("/upload", userAuth, upload, isFileValid, uploadFile)
    .put("/:id", userAuth, upload, isFileValid, updateFile)
    .delete("/:id", userAuth, deletePDFFile)

module.exports = app;