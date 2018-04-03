let env = require('./env');
let express = require('express');
let bodyParser = require('body-parser');
let cors = require('cors');
let IFCBuilder = require('infinitechain_nodejs');
let Util = require('ethereumjs-util');
let path = require('path');
let level = require('level');
let db = level('./db');

let app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(cors());

let server = require('http').createServer(app);

let serverAddress = '0x' + Util.privateToAddress(Buffer.from(env.signerKey, 'hex')).toString('hex');
console.log(serverAddress);
let ifc = new IFCBuilder().setNodeUrl(env.nodeUrl).
                           setWeb3Url(env.web3Url).
                           setSignerKey(env.signerKey).
                           setCipherKey(env.cipherKey).
                           setStorage('level', db).
                           setClientAddress(serverAddress).
                           setServerAddress(serverAddress).
                           build();
// two phase termination
let couldGracefulShotdown = true;

app.post('/quotes', async function (req, res) {
    try {
        // Get quotes and index from parameters
        let quotes = req.body.quotes;
        let index = req.body.index;
        let weightedIndex = req.body.weightedIndex;

        // Make rawPayment from quotes
        let ok = false;
        let counter = 0;
        let retryLimit = 5;
        let result;
        while (!ok && counter < retryLimit) {
            let keys = ifc.crypto.keyInfo();
            let data = { quotes: quotes, index: index, weightedIndex: weightedIndex, timestamp: (Math.floor(Date.now() / 1000)).toString(), pkClient: keys.rsaPublicKey, pkStakeholder: keys.rsaPublicKey };
            let rawPayment = await ifc.client.makeRawPayment(0, 0, data);
            await ifc.client.saveRawPayment(rawPayment);
            // Send rawPayment to Node
            let payment = ifc.server.signRawPayment(rawPayment);
            result = await ifc.server.sendPayments([payment]);
            ok = result.ok;
    
            if (ok) {
                console.log('Sent payment: ' + payment.paymentHash);
                await ifc.client.savePayment(payment);
                counter = 0;
                break;
            } else {
                console.log(result);
                counter++;
            }
        }

        res.send(result);
    } catch (e) {
        console.error(e);
        res.status(500).send({ errors: e.message });
    }
});

let watchBlockchainEvent = () => {
    if (ifc.sidechain.getIFCContract()) {
        ifc.event.watchAddNewStage(async (err, result) => {
            if (err) {
                console.log(err);
            } else {
                try {
                    console.log("Add new stage event");
                    let stageHash = result.args._stageHash;
                    let rootHash = result.args._rootHash;
                    console.log('StageHash: ' + stageHash);
                    console.log('RootHash: ' + rootHash);

                    // Audit
                    stageHash = stageHash.substring(2);
                    let paymentHashes = await ifc.client.getAllPaymentHashes(stageHash);
                    paymentHashes.forEach(async (hash) => {
                        let res = await ifc.client.audit(hash);
                        let rawPayment = await ifc.client.getRawPayment(hash);
                        let metadata = '{ Time: ' + rawPayment.data.timestamp + ', Index: ' + rawPayment.data.index + ', WeightedIndex: ' + rawPayment.data.weightedIndex + ' }'
                        console.log(metadata + ', audit result: ' + res);
                    });
                } catch (e) {
                    console.error(e);
                }
            }
        });

        ifc.event.watchFinalize((err, result) => {
            if (err) {
                console.log(err);
            } else {
                console.log("Finalize event")
            }
        });
    } else {
        setTimeout(watchBlockchainEvent, 1000);
    }
}

server.listen(3001, async function () {
    try {
        console.log('App listening on port 3001!');
        // Watch blockchain event
        watchBlockchainEvent();

        // Commmit Stage every 3 seconds
        setInterval(async () => {
            try {
                couldGracefulShotdown = false;
                let txHash = await ifc.server.commitPayments(86400, 0);
                console.log('Committed txHash: ' + txHash);
            } catch (e) {
                console.log(e.message);
            } finally {
                couldGracefulShotdown = true;
            }
        }, 3000);
    } catch (e) {
        console.error(e.message);
    }
});

if (process.platform === "win32") {
    let rl = require("readline").createInterface({
        input: process.stdin,
        output: process.stdout
    });

    rl.on("SIGINT", function () {
        process.emit("SIGINT");
    });
}

process.on("SIGINT", function () {
    if (couldGracefulShotdown) {
        process.exit();
    }

    setInterval(() => {
        process.exit();
    }, 1000)
});
