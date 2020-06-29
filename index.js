const express = require('express');
const cors = require('cors');
const email = require('./email');
const constants = require('./constants');

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

app.use(cors({
  origin: 'chrome-extension://pjojnlcgehphaopbdokegphapkjemcfp'
}));
app.use(express.json());


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
  try {

    email.testConnection(request.body.settings, responseData => {
      response.json(responseData);
    });

  } catch (exception) {

    response.json(constants.getErrorResponse(exception));

  }
});

// process.env.PORT allows heroku to assign the port
app.listen(process.env.PORT || 8000, () => {
  console.log("Server started");
});