const NodeGeocoder = require('node-geocoder');
const chiemgaukarte = require('./chiemgaukarte');
const email = require('./email');

const testGeocoder = () => {
    const options = {
        provider: 'here',
        apiKey: "4dbi4DTBFX-FBRNEMp-2X4d9F67tmRtBmbzCrZNenmk",
        language: "de"
    };

    const geocoder = NodeGeocoder(options);
    geocoder.geocode("Lornsenstr. 22 24768 Rendsburg")
        .then(result => console.log(result))
        .catch(error => console.log(error));
};

const testChiemgaukarte = () => {
    chiemgaukarte.processEmails().then(() => console.log("done"));
};
testChiemgaukarte();

const testEmailFolders = () => {
    const emailSettings = {
        user: "chiemgaukarte@inzell-ferien.de",
        password: "###Sonnenschein+++112233###",
        host: "imap.ionos.de",
        port: 993,
        tls: true
    };

    email.getFolderNames(emailSettings)
    .then(result => console.log(result));
}
//testEmailFolders();
