const createError = require("http-errors");

const notFound = (req,res,next) => {
    const error = createError(404,`/${req.path} not found`)
    next(error);
}

module.exports = notFound;