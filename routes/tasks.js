'use strict';

module.exports = function (router) {
    const task = require("../models/task");
    const user = require("../models/user");
    const query = require('../helper').query;
    const select = require('../helper').select;

    const homeRoute = router.route('/');

    homeRoute.get((req, res) => query(task, req, res));

    async function validateAssignedUser(curr_task, res) {
        // Checks whether the user id exists if it has been assigned
        try {
            if (curr_task.assignedUser != null && curr_task.assignedUser != '') {
                let data = await user.findById(curr_task.assignedUser);
                if (data != null) {
                    if (data.name != curr_task.assignedUserName) {
                        res.status(400).json({message: 'assignedUser and assignedUserName do not correspond to any users in the database', data});
                        return false;
                    }
                    return true;
                }
                res.status(400).json({message: 'Invalid assignedUser', data : curr_task.assignedUser});
                return false;
            }

            if (curr_task.assignedUserName != null && curr_task.assignedUserName != 'unassigned') {
                res.status(400).json({message: 'assignedUserName should be \'unassigned\' due missing unprovided assignedUser value', data : curr_task.assignedUserName});
                return false;
            }
            return true;
        } catch(err) {
            if (err.name == "MongooseError") {
                res.status(500).json({message: 'Interval Server Error', data: 'Could not connect to database'});
            } else {
                res.status(400).send({message: 'Invalid user ID', data : curr_task.pendingTasks});
            }
            return false;
        }
    }

    // Updates a task's assignedUserName field with the corresponding user's name
    // Adds the task to the assignedUser's pendingTask array
    async function updateAssignedUser(curr_task) {
        if (curr_task.assignedUser && curr_task.assignedUser != '' && !curr_task.completed) {
            await user.findByIdAndUpdate(curr_task.assignedUser, {$push : {pendingTasks : curr_task._id}});
        }
    }

    // Removes the current task from the assigned user's pending task list
    async function resetAssignedUser(curr_task) {
        if (curr_task.assignedUser != '') {
            await user.findByIdAndUpdate(curr_task.assignedUser, {$pull : {pendingTasks : curr_task._id}});
        }
    }

    homeRoute.post(async (req, res) => {
        const new_task = new task(req.body);

        if (!(await validateAssignedUser(new_task, res))) {
            return;
        }

        new_task.save().then(async data => {
            await updateAssignedUser(data);
            res.status(201).json({message: 'Created', data});
        }).catch(err => {
            if (err.name == "MongooseError") {
                res.status(500).json({message: 'Interval Server Error', data: 'Could not connect to database'});
            } else {
                res.status(400).send({message: 'Bad Request', data: 'Invalid task data'});
            }
        });
    })

    const idRoute = router.route('/:id');

    idRoute.get((req, res) => select(task, req, res));

    idRoute.delete((req, res) => {
        task.findById(req.params.id).then(doc => {
            doc.remove().then(async data => {
                await resetAssignedUser(data);
                res.status(200).json({message: 'OK', data});
            });
        }).catch(err => {
            if (err.name == "MongooseError") {
                res.status(500).json({message: 'Interval Server Error', data: 'Could not connect to database'});
            } else {
                res.status(404).send({message: 'Not Found', data: 'Invalid ID'});
            }
        })
    })

    idRoute.put((req, res) => {
        task.findById(req.params.id).then(async doc => {
                let old_doc = doc.toObject();
                await doc.overwrite(req.body);

                if (!(await validateAssignedUser(doc, res))) {
                    return;
                }

                doc.save().then(async data => {
                    await resetAssignedUser(old_doc);
                    await updateAssignedUser(data);
                    
                    res.status(200).json({message: 'OK', data});
                }).catch(err => {
                    if (err.name == "MongooseError") {
                        res.status(500).json({message: 'Interval Server Error', data: 'Could not connect to database'});
                    } else {
                        res.status(400).send({message: 'Bad Request', data: 'Invalid task data'});
                    }
                })
        }).catch(err => {
            if (err.name == "MongooseError") {
                res.status(500).json({message: 'Interval Server Error', data: 'Could not connect to database'});
            } else {
                res.status(404).send({message: 'Not Found', data: 'Invalid ID'});
            }
        })
    })

    return router;
}