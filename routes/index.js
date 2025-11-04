/*
 * Connect all of your endpoints together here.
 */
module.exports = function (app, router) {
    const validateVerb = require("../helper.js").validateVerb;
    app.use('/api/:p/:id?', validateVerb);
    app.use('/api', require('./tasks.js')(router));
    app.use('/api', require('./users.js')(router));
    app.use('/api', require('./home.js')(router));
};
