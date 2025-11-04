
// GET request for both user and tasks endpoints
function query(data, req, res) {
    try {
        // Format query parameters
        let where_query = req.query.where != null ? JSON.parse(req.query.where) : null;
        let select_query = req.query.select != null ? JSON.parse(req.query.select) : null;
        let sort_query = req.query.sort != null ? JSON.parse(req.query.sort) : null;
        let skip_query = parseInt(req.query.skip);
        let limit_query = parseInt(req.query.limit);
        let count_query = req.query.count != null ? req.query.count == 'true' : false;

        // Handle counting
        if (count_query) {
            data.countDocuments(where_query).exec().then(data => {
                if (data.length == 0) {
                    res.status(204).json({message: 'No Content', data});
                } else {
                    res.status(200).json({message: 'OK', data});
                }
            }).catch(() => {
                res.status(500).json({message: 'Bad Request', data: 'Could not perform query'});
            })

            return;
        }

        // Normal querying
        data.find(where_query).select(select_query).sort(sort_query).skip(skip_query).limit(limit_query).exec().then(data => {
            if (data.length == 0) {
                res.status(204).json({message: 'No Content', data});
            } else {
                res.status(200).json({message: 'OK', data});
            }
        }).catch(() => {
            res.status(400).json({message: 'Bad Request', data: 'Invalid Query Parameters'});
        })
    }

    catch {
        res.status(400).json({message: 'Bad Request', data: 'Invalid Query Parameters'});
    }
}

// GET request for both user/:id and task/:id endpoints
function select(data, req, res) {
    try {
        // Formats select parameter
        let select_query = req.query.select != null ? JSON.parse(req.query.select) : null;

        // executes query
        data.findOne({_id: req.params.id}).select(select_query).exec().then(data => {
            if (data) {
                res.status(200).json({message: 'OK', data});
            } else {
                res.status(404).json({message: 'Not Found', data: 'Invalid ID'});
            }
        }).catch(() => {
            res.status(400).json({message: 'Bad Request', data: 'Invalid Query Parameters'});
        })
    }
    
    // Catches formatting error
    catch {
        res.status(400).json({message: 'Bad Request', data: 'Invalid Query Parameters'});
    }
}

// Check if the verb is supported at the endpoint
function validateVerb(req, res, next) {
    if (req.params.id) {
        if (['GET', 'PUT', 'DELETE'].includes(req.method)) {
            next();
        } else {
            return res.status(405).json({message: 'Method Not Allowed', data : 'Only GET, PUT, and DELETE requests are allowed for this endpoint'});
        }
    } else {
        if (['GET', 'POST'].includes(req.method)) {
            next();
        } else {
            return res.status(405).json({message: 'Method Not Allowed', data : 'Only GET, and POST requests are allowed for this endpoint'});
        }
    }
}

// Handles any errors in the body of a request
function validateBody (err, req, res, next) {
    if (err instanceof SyntaxError) {
        res.status(400).json({message: 'Bad Request', data: 'Invalid Body Syntax'});
    } else {
        next();
    }
}

module.exports = {
    'query' : query,
    'select' : select,
    'validateVerb' : validateVerb,
    'validateBody' : validateBody,
}
