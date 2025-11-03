module.exports = function (router) {
    const task = require("../models/task");
    const user = require("../models/user");

    const homeRoute = router.route('/tasks');

    homeRoute.get((req, res) => {
        try {
            var where_query = req.query.where != null ? JSON.parse(req.query.where) : null;
            var select_query = req.query.select != null ? JSON.parse(req.query.select) : null;
            var sort_query = req.query.sort != null ? JSON.parse(req.query.sort) : null;
            var skip_query = parseInt(req.query.skip);
            var limit_query = parseInt(req.query.limit);
            var count_query = req.query.count != null ? req.query.count == "true" : false;

            if (count_query) {
                task.countDocuments(where_query).exec().then(data => {
                    if (data.length == 0) {
                        res.status(204).json({message: 'No Content',});
                    } else {
                        res.status(200).json({message: 'OK', data});
                    }
                }).catch(err => {
                    res.status(400).json({message: 'Bad Request', err});
                })
            } else {
                task.find(where_query).select(select_query).sort(sort_query).skip(skip_query).limit(limit_query).exec().then(data => {
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

    homeRoute.post(async (req, res) => {
        try {
            const doc = new task(req.body);

            if (doc.assignedUser != '') {
                await user.findByIdAndUpdate(doc.assignedUser, {$push : {pendingTasks : doc._id}}).exec();
                let doc2 = await user.findById(doc.assignedUser);
                doc.assignedUserName = doc2.name;
            }

            doc.save().then(data => {
                res.status(201).json({message: 'Created', data});
            }).catch(err => {
                res.status(400).send({message: 'Bad Request', err});
            });
        } catch(err) {
            res.status(400).send({message: 'Bad Request', err: "Invalid Body"});
        }
    })

    const idRoute = router.route('/tasks/:id'); 

    idRoute.get((req, res) => {
        task.findById(req.params.id).then(data => {
            res.status(200).json({message: 'OK', data});
        }).catch(err => {
            res.status(404).send({message: 'Not Found', err});
        })
    });

    idRoute.delete((req, res) => {
        task.findById(req.params.id).then(async doc => {
            if (doc.assignedUser != "") {
                await user.findByIdAndUpdate(doc.assignedUser, {$pull : {pendingTasks : doc._id}}).exec();
            }
            
            doc.remove().then(data => {
                res.status(200).json({message: 'OK', data});
            });
        }).catch(err => {
            res.status(404).send({message: 'Not Found', err});
        })
    })

    idRoute.put((req, res) => {
        task.findById(req.params.id).then(async doc => {
            old_user = doc.assignedUser;

            try {
                await doc.overwrite(req.body);
                
                if (doc.assignedUser != old_user) {
                    if (old_user != '') {
                        await user.findByIdAndUpdate(old_user, {$pull : {pendingTasks : doc._id}}).exec()
                    }

                    if (doc.assignedUser != '') {
                        await user.findByIdAndUpdate(doc.assignedUser, {$push : {pendingTasks : doc._id}}).exec();
                        let doc2 = await user.findById(doc.assignedUser);
                        doc.assignedUserName = doc2.name;
                    }
                }

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