const express = require('express');
const cors = require('cors');
const constants = require('./constants');
const db = require('./database');

/**
 * all response objects follow this structure:
 *  {
 *    status: "ok"|"error",
 *    error: null|string,
 *    data: {
 *            ...
 *          }
 *  }
 */
const app = express();

// makes all files in static folder accessible
app.use(express.static('static'));
app.use(express.static('img'));

const whitelist = [
    "chrome-extension://pgnbbjbgdibnhoiakimelpkpmckejiam", // store version
    "chrome-extension://bbnpipapilgcaemcdgimdcahfkmejmaf", // local me
    "chrome-extension://efgcphgecbopliofbjekeaaiiejbfnke", // local customer
]
app.use(cors({
    origin: (origin, callback) => {
        if (whitelist.indexOf(origin) !== -1) {
            callback(null, true)
        } else {
            console.log(`CORS denied. Origin: ${origin}`)
            callback(null, false)
        }
    }
}));
app.use(express.json());

/**
 * dummy path to wake the server from sleep
 */
app.get('/wake-up', (request, response) => {
    response.json(constants.getDataResponse("I am awake"));
});

/**
 * /db/get-firstname?name=Bastian
 */
app.get('/db/firstname', (request, response) => {

    const name = request.query.name;
    if (!name) {
        response.json(constants.getErrorResponse("no name parameter given. use ?name="));
        return;
    }

    db.getFirstname(name)
        .then(document => response.json(constants.getDataResponse(document !== null ? document : "not in db")))
        .catch(error => response.json(constants.getErrorResponse(error)));

});

/**
 * expects the body to look like this:
 *   {
 *      name: "Peter",
 *      gender: "M"|"F"
 *   }
 */
app.post('/db/firstname', (request, response) => {

    const body = request.body;
    if (!body || !body.name || !body.gender) {
        response.json(constants.getErrorResponse("no data provided"));
        return;
    }

    db.addFirstname(body.name, body.gender)
        .then(() => response.json(constants.getDataResponse({
            message: `successfully added "${body.name}"`
        })))
        .catch(error => response.json(constants.getErrorResponse(error)));

});

/**
 * expects the body to look like this:
 *   {
 *      name: "Peter"
 *   }
 */
app.delete('/db/firstname', (request, response) => {
    const name = request.query.name;
    if (!name) {
        response.json(constants.getErrorResponse(`query parameter "name" missing. use ?name=`));
        return;
    }

    db.deleteFirstname(name)
        .then(() => response.json(constants.getDataResponse({
            message: `successfully deleted "${name}"`
        })))
        .catch(error => response.json(constants.getErrorResponse(error)));
})

// stuff to do before actually listening to requests
db.init();

// process.env.PORT allows to assign the port
app.listen(process.env.PORT || 8000, () => {
    console.log(`Server started (${new Date().toLocaleDateString("de-DE", {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    })})`);
});