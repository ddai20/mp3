/*
 * Connect all of your endpoints together here.
 */
module.exports = function (app, router) {
    app.use('/api/:p/:id?', (req, res, next) => {
        if (req.params.id) {
            if (['GET', 'PUT', 'DELETE'].includes(req.method)) {
                next();
            } else {
                return res.status(405).json({message: 'Method Not Allowed'});
            }
        } else {
            if (['GET', 'POST'].includes(req.method)) {
                next();
            } else {
                return res.status(405).json({message: 'Method Not Allowed'});
            }
        }
    });

    app.use('/api', require('./tasks.js')(router));
    app.use('/api', require('./users.js')(router));
    app.use('/api', require('./home.js')(router));
};
