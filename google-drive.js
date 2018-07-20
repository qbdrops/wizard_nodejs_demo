const fs = require('fs');
const readline = require('readline');
const { google } = require('googleapis');

// If modifying these scopes, delete credentials.json.
const SCOPES = ['https://www.googleapis.com/auth/drive.file'];
const TOKEN_PATH = 'token.json';

var receipt = {"lightTxHash":"3a99577e4c393c5e43a18fa84471e4b5b833908c9058077459cc8b089992cceb","lightTxData":{"from":"0000000000000000000000000000000000000000000000000000000000000000","to":"00000000000000000000000049aabbbe9141fe7a80804bdf01473e250a3414cb","assetID":"0000000000000000000000000000000000000000000000000000000000000001","value":"00000000000000000000000000000000000000000000d3c21bcecceda1000000","fee":"000000000000000000000000000000000000000000000000002386f26fc10000","nonce":"9014880560bda9532646c664ecc8982eb199d49209a53bb6438248b88b63fd40","logID":"0000000000000000000000000000000000000000000000000000000000000000","metadataHash":"b48d38f93eaa084033fc5970bf96e559c33c4cdc07d889ab00b4d63f9590739d"},"receiptHash":"e0de555c722703707172efa5f3671efc99c2a4b629596fb240d18fd68b0997a5","receiptData":{"stageHeight":"0000000000000000000000000000000000000000000000000000000000000001","GSN":"0000000000000000000000000000000000000000000000000000000000000001","lightTxHash":"3a99577e4c393c5e43a18fa84471e4b5b833908c9058077459cc8b089992cceb","fromBalance":"0000000000000000000000000000000000000000000000000000000000000000","toBalance":"00000000000000000000000000000000000000000000d3c21bcecceda1000000"},"sig":{"clientLightTx":{"r":"0xb50ca0440bfa36b155a13aedd6c72a82740af746c76d2576c06588a9d6809722","s":"0x244a20c440e130e573c77e8f286596dc661ffd6a01a97d958dbd5a46b8ddea79","v":"0x000000000000000000000000000000000000000000000000000000000000001b"},"serverLightTx":{"r":"0xb50ca0440bfa36b155a13aedd6c72a82740af746c76d2576c06588a9d6809722","s":"0x244a20c440e130e573c77e8f286596dc661ffd6a01a97d958dbd5a46b8ddea79","v":"0x000000000000000000000000000000000000000000000000000000000000001b"}},"metadata":{}};

// Load client secrets from a local file.
fs.readFile('credentials.json', (err, content) => {
  if (err) return console.log('Error loading client secret file:', err);
  // Authorize a client with credentials, then call the Google Drive API.
  authorize(JSON.parse(content), uploadReceipts);
});

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize (credentials, callback) {
  const { client_secret, client_id, redirect_uris } = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
    client_id, client_secret, redirect_uris[0]);
  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getAccessToken(oAuth2Client, callback);
    oAuth2Client.setCredentials(JSON.parse(token));
    // callback(oAuth2Client);
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getAccessToken (oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('Authorize this app by visiting this url:', authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question('Enter the code from that page here: ', (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return callback(err);
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) console.error(err);
        console.log('Token stored to', TOKEN_PATH);
      });
      // callback(oAuth2Client);
    });
  });
}

/**
 * Lists the names and IDs of up to 10 files.
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
async function uploadReceipts (auth) {
  try {
    let drive = google.drive({ version: 'v3', auth });
    let folderId = await createFolder(drive);
    console.log(folderId);
    var fileMetadata = {
      'name': 'receipt1',
      'mimeType': 'application/json',
      parents: [folderId]
    };
    var media = {
      mimeType: 'application/json',
      body: JSON.stringify(receipt)
    };
    drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id'
    }, function (err, response) {
      if (err) {
        console.error(err);
      } else {
        console.log('File Id:', response.data.id);
      }
    });
  } catch (e) {
    console.log(e);
  }
}

// async function createFolder (drive) {
//   return new Promise((resolve) => {
//     var fileMetadata = {
//       'name': 'receipts-address',
//       'mimeType': 'application/vnd.google-apps.folder'
//     };
//     drive.files.create({
//       resource: fileMetadata,
//       fields: 'id'
//     }, function (err, response) {
//       if (err) {
//         console.error(err);
//       } else {
//         resolve(response.data.id);
//       }
//     });
//   });
// }