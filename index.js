const express = require('express');
const cors = require('cors');
const email = require('./email');
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

const whitelist = ['chrome-extension://pjojnlcgehphaopbdokegphapkjemcfp', "chrome-extension://pgnbbjbgdibnhoiakimelpkpmckejiam"]
app.use(cors({
    origin: (origin, callback) => {
        if (whitelist.indexOf(origin) !== -1) {
            callback(null, true)
        } else {
            callback(new Error('Not allowed by CORS'))
        }
    }
}));
app.use(express.json());

/**
 * dummy path to wake the server from heroku sleep
 */
app.get('/wake-up', (request, response) => {
    response.json(constants.getDataResponse("I am awake"));
});

/**
 * expects the body to look like this:
 *   {
 *     from: "a@b.de",
 *     settings: {
 *       user: "mymail@mail.de",
 *       password: "mypassword",
 *       host: "my.imap.provider.com",
 *       port: 993,
 *       tls: true|false
 *     }
 *   }
 */
app.post('/fetch-mail', (request, response) => {

    // this try catch should never trigger, but just in case
    try {

        email.fetchMails(request.body.settings, request.body.from, responseData => {
            response.json(responseData);
        });

    } catch (exception) {

        response.json(constants.getErrorResponse(exception));

    }
});

/**
 * expects the body to look like this:
 *   {
 *     settings: {
 *       user: "mymail@mail.de",
 *       password: "mypassword",
 *       host: "my.imap.provider.com",
 *       port: 993,
 *       tls: true|false
 *     }
 *   }
 */
app.post('/test-connection', (request, response) => {

    // this try catch should never trigger, but just in case
    try {

        email.testConnection(request.body.settings, responseData => {
            response.json(responseData);
        });

    } catch (exception) {

        response.json(constants.getErrorResponse(exception));

    }
});

/**
 * /db/get-firstname?name=Bastian
 */
app.get('/db/get-firstname', (request, response) => {

    const name = request.query.name;
    if (!name) {
        response.json(constants.getErrorResponse("no name parameter given. use ?name="));
        return;
    }

    db.getFirstname(name)
        .then(
            onFulfilled = document => response.json(constants.getDataResponse(document)),
            onRejected = reason => response.json(constants.getErrorResponse(reason))
        )
        .catch(error => response.json(constants.getErrorResponse(error)));

});

/**
 * expects the body to look like this:
 *   {
 *      name: "Peter",
 *      gender: "M"
 *   }
 */
app.put('/db/put-firstname', (request, response) => {

    const body = request.body;
    if (!body || !body.name || !body.gender) {
        response.json(constants.getErrorResponse("no data provided"));
        return;
    }

    db.putFirstname(body.name, body.gender)
        .then(
            onFulfilled = () => response.json(constants.getDataResponse({
                message: `successfully added "${body.name}"`
            })),
            onRejected = reason => response.json(constants.getErrorResponse(reason))
        )
        .catch(error => response.json(constants.getErrorResponse(error)));

});

/**
 * expects the body to look like this:
 *   {
 *      name: "Peter"
 *   }
 */
app.delete('/db/delete-firstname', (request, response) => {
    const body = request.body;
    if (!body || !body.name) {
        response.json(constants.getErrorResponse("no data provided"));
        return;
    }

    db.deleteFirstname(body.name)
        .then(
            onFulfilled = () => response.json(constants.getDataResponse({
                message: `successfully deleted "${body.name}"`
            })),
            onRejected = reason => response.json(constants.getErrorResponse(reason))
        )
        .catch(error => response.json(constants.getErrorResponse(error)));
})

// stuff to do before actually listening to requests
db.init();

// process.env.PORT allows heroku to assign the port
app.listen(process.env.PORT || 8000, () => {
    console.log(`Server started (${new Date().toLocaleDateString("de-DE", {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
})})`);
});