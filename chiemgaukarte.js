
const email = require('./email');
const mimemessage = require('mimemessage');
const node_util = require('util');
const util = require('./util');
const img = require('./chiemgaukarte_data').img;

const emailText = {
    html: `
<html>
<head>
<style>
p{
font-family: Calibri, sans-serif;
font-size: 11pt;
}
p.signature{
font-size: 10.0pt;
font-family: "Arial",sans-serif;
color: black;
}
span#signature{
color: #4472C4;
font-weight: bold;
}
a#chiemgaukarte{
color: #4472C4;
}
a#mailto, a#website{
color: black;
}
#anreise{
background: yellow;
}
</style>
</head>
<body>
<p>Sehr geehrter Gast,</p>

<p>wie bereits im vorherigen Schreiben erwähnt, ist bei uns die <strong id="anreise">Anreise ab 16:00 Uhr</strong> möglich.</p>

<p>Mit der Chiemgaukarte für Ihr Smartphone können Sie bereits den Anreisetag mit Aktivitäten nutzen. Einfach auf folgenden Link gehen und die Chiemgaukarte runterladen. Die Karte ist bereits am Anreisetag gültig. </p>

<p>Link zu Ihrer Chiemgaukarte: <a id="chiemgaukarte" href="|link|" target="_blank">|link|</a></p>

<p>Die für Sie kostenlosen Aktivitäten (Leistungsverzeichnis) können Sie über den Download rechts oben abrufen. Der QR-Code ist an der Kasse vorzuzeigen und kann dann abgescannt werden.</p>

<img src="${img}"></img>

<p>Natürlich erhalten Sie von uns die Chiemgaukarte beim Check-In auch in Papierform.</p>

<p>Viele Grüße aus Inzell<br />
Andrea und Jan Schattenberg</p>

<p class="signature">
<span id="signature">Apartmenthaus Sonnenschein</span><br />
Lärchenstraße 13, 83334 Inzell<br />
Tel. +49 152 0815 1901<br />
e-mail: <a id="mailto" href="mailto:info@inzell-ferien.de">info@inzell-ferien.de</a><br />
<a id="website" href="https://www.inzell-ferien.de">www.inzell-ferien.de</a></p>
</body></html>`,
    plain:
        `Sehr geehrter Gast,

wie bereits im vorherigen Schreiben erwähnt, ist bei uns die Anreise ab 16:00 Uhr möglich. 

Mit der Chiemgaukarte für Ihr Smartphone können Sie bereits den Anreisetag mit Aktivitäten nutzen. Einfach auf folgenden Link gehen und die Chiemgaukarte runterladen. Die Karte ist bereits am Anreisetag gültig. 

Link zu Ihrer Chiemgaukarte: |link|

Die für Sie kostenlosen Aktivitäten (Leistungsverzeichnis) können Sie über den Download rechts oben abrufen. Der QR-Code ist an der Kasse vorzuzeigen und kann dann abgescannt werden

Natürlich erhalten Sie von uns die Chiemgaukarte beim Check-In auch in Papierform. 

Viele Grüße aus Inzell
Andrea und Jan Schattenberg

Apartmenthaus Sonnenschein
Lärchenstraße 13, 83334 Inzell
Tel. +49 152 0815 1901
e-mail: info@inzell-ferien.de
www.inzell-ferien.de
`,
    linkPlaceholder: "|link|"
};

const emailSettings = {
    user: "chiemgaukarte@inzell-ferien.de",
    password: "###Sonnenschein+++112233###",
    host: "imap.ionos.de",
    port: 993,
    tls: true
};

/**
 * fetches all mails from info@inzell.de that are in the inbox
 */
const fetchFromCatchAll = () => {
    return email.fetchMailsFrom(emailSettings, "info@inzell.de", "");
};

/**
 * extracts the intended recipient and the link
 * @param {*} mail 
 */
const extractInfo = mail => {
    const catchallRecipient = mail.headers.get('return-path').text;
    const to = catchallRecipient.slice(0, catchallRecipient.indexOf('@')).replace('|at|', '@');
    const link = mail.text.match(/(\S*?emeldeschein\.de\S*)/gim)[0];

    return {
        to: to,
        link: link
    };
}

/**
 * creates a MIME message for every mail object given
 * @param {*} mails 
 */
const createDrafts = mails => {
    const drafts = mails.map(mail => {
        const { to, link } = extractInfo(mail);

        const message = mimemessage.factory({
            contentType: 'multipart/mixed',
            body: []
        });

        message.header("From", "chiemgaukarte@inzell-ferien.de");
        message.header("To", to);
        message.header("Reply-To", "info@inzell-ferien.de");
        message.header("Subject", "Elektronische Chiemgaukarte | Ruhpolding & Inzell");

        // alternate entity - the part that fits best will be displayed
        const alternativeEntity = mimemessage.factory({
            contentType: 'multipart/alternative',
            body: []
        });

        const htmlEntity = mimemessage.factory({
            contentType: 'text/html;charset=utf-8',
            contentTransferEncoding: 'base64',
            body: Buffer.from(emailText.html.split(emailText.linkPlaceholder).join(link)).toString('base64')
        });

        const plainEntity = mimemessage.factory({
            contentType: 'text/plain;charset=utf-8',
            contentTransferEncoding: 'base64',
            body: Buffer.from(emailText.plain.split(emailText.linkPlaceholder).join(link)).toString('base64')
        });

        alternativeEntity.body.push(htmlEntity);
        alternativeEntity.body.push(plainEntity);

        message.body.push(alternativeEntity);

        return message.toString();
    });

    return drafts;
};

const saveDrafts = drafts => {

    if(drafts.length === 0){
        return;
    }

    const promises = drafts.reduce((map, _) => {
        map[_] = util.generateDeferredPromise();
        return map;
    }, {});

    drafts.forEach(draft => email.save(emailSettings, draft, "Entwürfe")
        .then(() => promises[draft].resolve())
        .catch(error => promises[draft].resolve(error))
    );

    return Promise.all(
        Object.entries(promises).map(deferred => deferred.promise)
    )
        .then(() => console.log(`all drafts saved (${drafts.length})`));
};

const moveProcessed = mails => {
    if(mails.length === 0){
        return;
    }

    return email.move(emailSettings, mails, "INBOX", "bearbeitet")
        .then(() => console.log("processed emails moved to 'bearbeitet'"));
};


module.exports = {

    processEmails: function () {

        let mailsToProcess = [];
        return fetchFromCatchAll()
            .then(mails => mails.mails)
            .then(mails => {
                mailsToProcess = mails;
                return createDrafts(mails);
            })
            .then(drafts => saveDrafts(drafts))
            .then(() => moveProcessed(mailsToProcess))
            .catch(error => console.log(error));

    }

};