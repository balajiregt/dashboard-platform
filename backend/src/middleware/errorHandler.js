const { logger } = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
    // Log the error
    logger.error('Error occurred:', {
        error: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent')
    });

    // Default error
    let error = {
        message: err.message || 'Internal Server Error',
        status: err.status || 500
    };

    // Handle specific error types
    if (err.name === 'ValidationError') {
        error.status = 400;
        error.message = 'Validation Error';
        error.details = err.details;
    } else if (err.name === 'CastError') {
        error.status = 400;
        error.message = 'Invalid ID format';
    } else if (err.code === 11000) {
        error.status = 409;
        error.message = 'Duplicate entry';
    } else if (err.name === 'JsonWebTokenError') {
        error.status = 401;
        error.message = 'Invalid token';
    } else if (err.name === 'TokenExpiredError') {
        error.status = 401;
        error.message = 'Token expired';
    }

    // Don't leak error details in production
    if (process.env.NODE_ENV === 'production' && error.status === 500) {
        error.message = 'Internal Server Error';
        error.details = undefined;
    }

    // Send error response
    res.status(error.status).json({
        error: error.message,
        details: error.details,
        timestamp: new Date().toISOString(),
        path: req.url
    });
};

module.exports = errorHandler;
