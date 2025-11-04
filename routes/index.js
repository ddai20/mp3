/*
 * Connect all of your endpoints together here.
 */

'use strict';

module.exports = function (app, router) {
    const validateVerb = require("../helper.js").validateVerb;
    const taskRouter = require('express').Router();
    const userRouter = require('express').Router();

    app.use('/api/:p/:id?', validateVerb);
    app.use('/api/tasks', require('./tasks.js')(taskRouter));
    app.use('/api/users', require('./users.js')(userRouter));
    app.use('/api', require('./home.js')(router));
    app.use('/api', (req, res) => {
        res.status(404).json({message : "Invalid Endpoint", data: req.url});
    })
};
