const {google} = require('googleapis');
const drive = google.drive("v3");
const File = require("../models/files.model");
const key = require("../private_key.json");
const createError = require("http-errors");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require('uuid');

const authorize = async () => {
    try{
        const jwtToken = new google.auth.JWT(
            key.client_email,
            null,
            key.private_key,
            ["https://www.googleapis.com/auth/drive"],
            null
        );
        await jwtToken.authorize();
        return jwtToken;
    }catch(error){
        console.error("Failed to authorize the google drive api");
        throw error;
    }
}

const getDriveFile = async fileId => {
    try{
        const auth = await authorize();
        const uniqueFileName = uuidv4();
        const filePath = `${process.cwd()}/downloads/${uniqueFileName}.pdf`;
        const output = fs.createWriteStream(filePath);
        const res = await drive.files.get({
            auth, 
            fileId, 
            alt: 'media'
        }, {responseType: 'stream'});
        return new Promise((resolve,reject) => {
            res.data
                .on('end', function () { resolve(filePath) })
                .on('error', function (err) { reject(err) })
                .pipe(output)
        });
    }catch(error){
        console.error("Failed to get the file");
        throw error;
    }
}

const createFolderInDrive = async folderName => {
    try{
        const auth = await authorize();
        const parentFolderId = process.env.DRIVE_FOLDER_ID;
        const resource = {
            name: folderName,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [parentFolderId]
        };
        const { data: { id }} = await drive.files.create({
            auth,
            resource,
            fields: 'id'
        });
        return id;
    }catch(error){
        console.error("Failed to create a folder");
        throw error;
    }
}

const uploadFileToDrive = async (file,fileName,parentFolderId) => {
    try{
        const auth = await authorize();
        const resource = {
            name: fileName,
            parents: [parentFolderId]
        };
        const media = {
            mimeType: file.mimetype,
            body: fs.createReadStream(path.join(process.cwd(),file.path))
        }
        const { data : { id }} = await drive.files.create({
            auth,
            media,
            resource,
            fields: 'id'
        });
        return id;
    }catch(error){
        console.error("Error while uploading the file to the drive");
        console.error(error.response.data.error);
        throw createError(400,"Failed to upload the file");
    }
}

const deleteFile = async file => {
    try{
        const auth = await authorize();
        const { _id,gid,original,folderId } = file;
        const ids = [_id];
        if(original){
            const childFiles = await File.find({parentFileId: _id});
            if(childFiles && childFiles.length)
                ids.push(...childFiles.map(childFile => childFile._id));
            await drive.files.delete({
                auth,
                fileId: folderId,
            });
        }else{
            await drive.files.delete({
                auth,
                fileId: gid,
            });
        }
        return ids;
    }catch(error){
        console.error("Failed to delete a file");
        console.error(error);
        throw createError(400, "Deletion failed due to some reason");
    }
}

module.exports = {
    uploadFileToDrive,
    createFolderInDrive,
    getDriveFile,
    deleteFile
}
