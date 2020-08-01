const NodeGeocoder = require('node-geocoder');

const options = {
    provider: 'here',
    apiKey: "4dbi4DTBFX-FBRNEMp-2X4d9F67tmRtBmbzCrZNenmk",
    language: "de"
};

const geocoder = NodeGeocoder(options);

geocoder.geocode("Lornsenstr. 22 24768 Rendsburg")
    .then(result => console.log(result))
    .catch(error => console.log(error));