const express = require('express');
const cors = require('cors');
const email = require('./email');

const app = express();

app.use(cors());
app.use(express.json());

/**
 * all respone objects follow this structure:
 *  {
 *    status: "ok"|"error",
 *    error: null|string,
 *    data: {
 *            ...
 *          }
 *  }
 */

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
  email.fetchMails(request.body.settings, request.body.from, responseData => {
    response.json(responseData);
  });
});

app.listen(process.env.PORT || 8000, () => {
  console.log("Server started");
});