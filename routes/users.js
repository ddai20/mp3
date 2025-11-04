module.exports = function (router) {
    const user = require('../models/user');
    const task = require('../models/task');
    const query = require('../helper').query;
    const select = require('../helper').select;

    'use strict';

    const homeRoute = router.route('/users');

    homeRoute.get((req, res) => query(user, req, res));

    async function validatePendingTasks(curr_user, res) {
        //Checks whether all task ids exist
        try {
            let found_ids = await task.find({_id : {$in : curr_user.pendingTasks}});
            if (found_ids.length != curr_user.pendingTasks.length) {
                invalid_ids = curr_user.pendingTasks.filter(item => !found_ids.includes(item));
                res.status(400).send({message: 'Some tasks IDs do not exist', data : invalid_ids});
                return false;
            }

            // Checks whether all tasks are not assigned to another user

            let already_assigned = await task.find({_id : {$in : curr_user.pendingTasks}, 
                                                    assignedUser : {$nin : ['', curr_user._id]}});

            if (already_assigned.length > 0) {
                console.log(already_assigned[0].assignedUser ===  '');
                res.status(400).send({message: 'Some tasks have already been assigned to another user', data : already_assigned});
                return false;
            }

            return true;
        } catch(err) {
            console.log(err);
            res.status(400).send({message: 'Invalid task IDs', data : curr_user.pendingTasks});
        }
    }

    // Updates assignedUser and assignedUserName attributes for each pending task to the user's id and name
    async function updatePendingTasks(curr_user) {
        await task.updateMany({_id : {$in : curr_user.pendingTasks}}, {assignedUser : curr_user._id, assignedUserName : curr_user.name}).exec();
    }

    homeRoute.post(async (req, res) => {
        const new_user = new user(req.body);

        if (!(await validatePendingTasks(new_user, res))) {
            return;
        }

        new_user.save().then(async data => {
            await updatePendingTasks(data);

            res.status(201).json({message: 'Created', data});
        }).catch(() => {
            res.status(400).send({message: 'Bad Request', data: 'Invalid body'});
        });
    })

    const idRoute = router.route('/users/:id');

    idRoute.get((req, res) => select(user, req, res));

    idRoute.delete((req, res) => {
        user.findByIdAndDelete(req.params.id).exec().then(async data => {
            // Unassigns user from ALL TASKS that were assigned to it (even completed)
            await task.updateMany({assignedUser : data._id}, {assignedUser : '', assignedUserName : 'unassigned'});
            
            res.status(200).json({message: 'OK', data});
        }).catch(() => {
            res.status(404).send({message: 'Not Found', data : 'Invalid ID'});
        })
    })

    idRoute.put((req, res) => {
        user.findById(req.params.id).then(async doc => {
            try {

                let old_tasks = doc.pendingTasks;
                doc.overwrite(req.body);

                if (!(await validatePendingTasks(doc, res))) {
                    return;
                }

                doc.save().then(async data => {
                    //unassigns user from previous pending tasks
                    await task.updateMany({_id : {$in : old_tasks}}, {assignedUser : '', assignedUserName : 'unassigned'});

                    await updatePendingTasks(data);
                    
                    res.status(200).json({message: 'OK', data});
                }).catch(() => {
                    res.status(500).send({message: 'Server Error', data: 'Could not save document'});
                })
            } catch {
                res.status(400).send({message: 'Bad Request', data: 'Invalid Supplied User'});
            }
        }).catch(() => {
            res.status(404).send({message: 'Not Found', data: 'Invalid ID'});
        })
    })

    return router;
}