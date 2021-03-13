
const errorHandler = (err,req,res,next) => {
    const error = {
        status: err.status || 500,
        message: err.message || "Internal Server Error"
    };
    err.errors ? error.errors = err.errors : "";
    res.status(err.status || 500);
    res.send({
        error
    })
}

module.exports = errorHandler;