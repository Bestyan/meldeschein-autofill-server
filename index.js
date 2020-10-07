const express = require('express');
const cors = require('cors');
const email = require('./email');
const constants = require('./constants');
const db = require('./database');
const geocoder = require('./geocoder');

const schedule = require('node-schedule');
const chiemgaukarte = require('./chiemgaukarte');

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
    "chrome-extension://pjojnlcgehphaopbdokegphapkjemcfp", // local me
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
 * @deprecated
 */
app.post('/fetch-mail', (request, response) => {

    email.fetchMailsFrom(request.body.settings, request.body.from, "")
        .then(responseData => response.json(constants.getDataResponse(responseData)))
        .catch(error => response.json(constants.getErrorResponse(error)));

});

app.post('/fetch-all-mails', (request, response) => {

    const { settings, from, firstname, lastname } = request.body;

    email.fetchAllMails(settings, from, firstname, lastname)
        .then(responseData => response.json(constants.getDataResponse(responseData)))
        .catch(error => response.json(constants.getErrorResponse(error)));

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

    email.testConnection(request.body.settings)
        .then(responseData => response.json(constants.getDataResponse(responseData)))
        .catch(error => response.json(constants.getErrorResponse(error)));

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
        .then(document => response.json(constants.getDataResponse(document !== null ? document : "not in db")))
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
app.delete('/db/delete-firstname', (request, response) => {
    const name = request.query.name;
    if (!name) {
        response.json(constants.getErrorResponse("no name parameter given. use ?name="));
        return;
    }

    db.deleteFirstname(name)
        .then(() => response.json(constants.getDataResponse({
            message: `successfully deleted "${name}"`
        })))
        .catch(error => response.json(constants.getErrorResponse(error)));
})

/**
 * response data looks like this:
 *  {
 *      country, city, state, zipcode, streetName, streetNumber
 *  }
 */
app.get('/get-location', (request, response) => {

    const locationString = request.query.location_string;
    if (!locationString) {
        response.json(constants.getErrorResponse("no location string given. use ?location_string="));
        return;
    }

    geocoder.getLocation(locationString)
        .then(locations => {
            if (locations.length === 0) {
                response.json(constants.getErrorResponse("no address found"));
                return;
            }

            // if there are more than 1 location, only the first will make it back
            response.json(constants.getDataResponse(locations[0]));
        })
        .catch(error => response.json(constants.getErrorResponse(error)));

});

app.get('/process-emails', (request, response) => {
    chiemgaukarte.processEmails()
    .then(() => response.json(constants.getDataResponse("emails processed")))
    .catch(error => response.json(constants.getErrorResponse(error)));
})


// run processEmails once per hour
const chiemgaukartenSchedule = schedule.scheduleJob('* * /1 * * *', () => {
    console.log(`running scheduled processEmails (${new Date()})`);
    chiemgaukarte.processEmails();
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