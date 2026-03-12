const HttpStatus = require('../enums/httpStatusCode.enum');

const errorHandler = (err, req, res, next) => {
    console.error('Error:', err);

    const send = (status, success, message, error) => {
        if (typeof res.error === 'function') {
            return res.error(status, success, message, error);
        }
        return res.status(status).json({ status, success, message, error });
    };

    if (err && err.name === 'ValidationError') {
        return send(HttpStatus.BAD_REQUEST, false, 'Validation Error', err.errors);
    }

    if (err && err.name === 'SequelizeValidationError') {
        const errors = Array.isArray(err.errors) ? err.errors.map(e => e.message) : err.message;
        return send(HttpStatus.BAD_REQUEST, false, 'Database Validation Error', errors);
    }

    return send(HttpStatus.INTERNAL_SERVER_ERROR, false, 'Internal Server Error', err && err.message ? err.message : String(err));
};

module.exports = errorHandler;