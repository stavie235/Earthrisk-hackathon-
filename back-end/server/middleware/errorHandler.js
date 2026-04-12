const { formatTimestamp } = require('../utils/dateUtils');

const errorHandler = (err, req, res, next) => {

    // if we reached the errorHandler with 200 status code, change it to 500
    const statusCode = res.statusCode !== 200 ? res.statusCode : 500;
    
    // set status code as result
    res.status(statusCode);

    let errorMessage = err.message;

    // If err.message is empty, fill it with the Requirement defaults
    if (!errorMessage) {
        if (statusCode === 400) errorMessage = 'Bad request'; 
        if (statusCode === 404) errorMessage = 'Not found'; 
        if (statusCode === 500) errorMessage = 'Internal server error';
    }
    // create error log
    const errorLog = {
        call: req.originalUrl,                     // The full URL called
        timeref: formatTimestamp( new Date()),      // Timestamp
        originator: req.ip,                        // IP address of the caller
        return_code: statusCode,                   // HTTP status code (400, 404, 500)
        error: err.message || 'Internal Server Error', // Description
        debuginfo: process.env.NODE_ENV === 'development' ? err.stack : null 
        // 'stack' shows exactly where the code broke (useful for debugging)
    };

    // 4. Log to your server console (so you can see it in terminal)
    console.error('Error Logged:', errorLog);

    // 5. Send the JSON response to the user
    res.json(errorLog);
};

module.exports = errorHandler;
