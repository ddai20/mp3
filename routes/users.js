module.exports = function (router) {
    const user = require("../models/user");
    const task = require("../models/task");

    const homeRoute = router.route('/users');

    homeRoute.get((req, res) => {
        try {
            var where_query = req.query.where != null ? JSON.parse(req.query.where) : null;
            var select_query = req.query.select != null ? JSON.parse(req.query.select) : null;
            var sort_query = req.query.sort != null ? JSON.parse(req.query.sort) : null;
            var skip_query = parseInt(req.query.skip);
            var limit_query = parseInt(req.query.limit);
            var count_query = req.query.count != null ? req.query.count == "true" : false;

            if (count_query) {
                user.countDocuments(where_query).exec().then(data => {
                    if (data.length == 0) {
                        res.status(204).json({message: 'No Content',});
                    } else {
                        res.status(200).json({message: 'OK', data});
                    }
                }).catch(err => {
                    res.status(400).json({message: 'Bad Request', err});
                })
            } else {
                user.find(where_query).select(select_query).sort(sort_query).skip(skip_query).limit(limit_query).exec().then(data => {
                    if (data.length == 0) {
                        res.status(204).json({message: 'No Content',});
                    } else {
                        res.status(200).json({message: 'OK', data});
                    }
                }).catch(err => {
                    res.status(400).json({message: 'Bad Request', err});
                })
            }
        }

        catch(err) {
            res.status(400).send({message: 'Bad Request', err: "Invalid Query Parameters"});
        }
    });

    homeRoute.post((req, res) => {
        try {
            const new_user = new user(req.body);

            new_user.save().then(data => {
                res.status(201).json({message: 'Created', data});
            }).catch(err => {
                res.status(400).send({message: 'Bad Request', err});
            });
        } catch(err) {
            res.status(400).send({message: 'Bad Request', err: "Invalid Body"});
        }
    })

    const idRoute = router.route('/users/:id'); 

    idRoute.get((req, res) => {
        user.findById(req.params.id).then(data => {
            res.status(200).json({message: 'OK', data});
        }).catch(err => {
            res.status(404).send({message: 'Not Found', err});
        })
    });

    idRoute.delete((req, res) => {
        user.findByIdAndDelete(req.params.id).exec().then(async doc => {
            await task.updateMany({_id : {$in : doc.pendingTasks}}, {assignedUser : '', assignedUserName : 'unassigned'});
            
            doc.remove().then(data => {
                res.status(200).json({message: 'OK', data});
            });
        }).catch(err => {
            res.status(404).send({message: 'Not Found', err});
        })
    })

    idRoute.put((req, res) => {
        user.findById(req.params.id).then(async doc => {
            try {
                old_tasks = doc.pendingTasks;
                await doc.overwrite(req.body);

                await task.updateMany({_id : {$in : old_tasks}}, {assignedUser : '', assignedUserName : 'unassigned'});
                await task.updateMany({_id : {$in : doc.pendingTasks}}, {assignedUser : doc._id, assignedUserName : doc.name});


                doc.save().then(data => {
                    res.status(200).json({message: 'OK', data});
                }).catch(err => {
                    res.status(400).send({message: 'Bad Request', err});
                })

            } catch(err) {
                res.status(400).send({message: 'Bad Request', err: "Invalid Supplied Task"});
            }
        }).catch(err => {
            res.status(404).send({message: 'Not Found', err});
        })
    })

    return router;
}