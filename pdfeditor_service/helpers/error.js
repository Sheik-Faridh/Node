const createError = require("http-errors");

const getErrorMessage = errors => errors.reduce((errObj,error)=>{
    errObj.push({
        field: error.dataPath.substring(1),
        message: error.message
    });
    return errObj;
},[])

const axiosErrorHandler = error => {
    if(error.response)
        return createError(error.response.status,error.response.data.error.message);
    else if(error.request)
        return createError(503,"Service is temporarily unavailable");
    return createError(500,"Internal Server Error");
}
    
module.exports = {
    getErrorMessage,
    axiosErrorHandler
}