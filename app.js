// Import the installed modules.
const express = require('express');
const createError = require('http-errors');
const axios = require('axios');
const redis = require('redis');
const logger = require('morgan');

// Set up port to listen on and routes
const httpServer = http.createServer(app);
httpServer.listen(3000);
const indexRouter = require('./routes/index');

const app = express();
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

// Define route names
app.use('/', indexRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
});

module.exports = app;