const fs = require('fs').promises;
const readline = require('readline');
const {google} = require('googleapis');

const SCOPES = [
    'https://www.googleapis.com/auth/drive.metadata.readonly',
    'https://www.googleapis.com/auth/drive.readonly',
    'https://www.googleapis.com/auth/drive.file',
];

const redirect_uris = [
    'urn:ietf:wg:oauth:2.0:oob',
    'http://localhost'
];

const TOKEN_PATH = './.certs/token.json';

const oAuth2Client = new google.auth.OAuth2(
    process.env.G_CLIENT_ID,
    process.env.G_CLIENT_SECRET,
    redirect_uris[0],
);

const drive = google.drive({
    version: 'v3', 
    auth: oAuth2Client
});

oAuth2Client.on('tokens', async (tokens) => {
    if (tokens.refresh_token) {
        await fs.writeFile(TOKEN_PATH, JSON.stringify(tokens));
        console.log('token stored', TOKEN_PATH);
    }
});

async function setup() {
    const token = await fs.readFile(TOKEN_PATH).catch(() => {
        return getAccessToken(oAuth2Client);
    });
    oAuth2Client.setCredentials(JSON.parse(token));
}

async function getAccessToken(oAuth2Client) {
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
    });

    console.log('Authorize', authUrl);

    const rl = readline.createInterface({
        input: process.stdin,
        ouput: process.stdout,
    });

    return new Promise((resolve) => {
        rl.question('code:', async (code) => {
            rl.close();
            const {tokens} = await oAuth2Client.getToken(code);

            resolve(JSON.stringify(tokens));
        });
    });
}

async function listFiles(parent='118PRmD81epxBEp6DeNfSQI9GxxdQ2r-p', pageSize, pageToken) {
    const files = await drive.files.list({
        corpora: 'allDrives',
        includeItemsFromAllDrives: true,
        supportsAllDrives: true,
        pageSize,
        pageToken,
        orderBy: 'name desc',
        q: `"${parent}" in parents`,
    });
    return files.data;
}

function getFile(fileId, dest) {
    drive.files.get({
        fileId,
        includeItemsFromAllDrives: true,
        supportsAllDrives: true,
        alt: 'media'
    }, {responseType: 'stream'}, function(err, res){
        res.data
            .on('end', () => {
            })
            .on('error', err => {
                console.log('Error', err);
            })
            .pipe(dest);
    });
}

function getFileInfo(fileId) {
    return drive.files.get({
        fileId,
        includeItemsFromAllDrives: true,
        supportsAllDrives: true,
        fields: ['name']
    });
}

module.exports = {
    setup,
    listFiles,
    getFile,
    getFileInfo,
};
