let env = require('./env');
let express = require('express');
let bodyParser = require('body-parser');
let cors = require('cors');
let IFCBuilder = require('infinitechain_nodejs');
let path = require('path');
let level = require('level');
let db = level('./db');
let app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(cors());

let server = require('http').createServer(app);

let ifc = new IFCBuilder().setNodeUrl(env.nodeUrl).
                           setWeb3Url(env.web3Url).
                           setSignerKey(env.signerKey).
                           setCipherKey(env.cipherKey).
                           setStorage('level', db).
                           setClientAddress('0x49aabbbe9141fe7a80804bdf01473e250a3414cb').
                           setServerAddress('0x5b9688b5719f608f1cb20fdc59626e717fbeaa9a').
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
        var keys = ifc.crypto.keyInfo();
        let data = { quotes: quotes, index: index, weightedIndex: weightedIndex, timestamp: (new Date()).toString(), pkClient: keys.rsaPublicKey, pkStakeholder: keys.rsaPublicKey };
        var rawPayment = ifc.client.makeRawPayment(0, 0, data);
        await ifc.client.saveRawPayment(rawPayment);

        // Send rawPayment to Node
        let payment = ifc.server.signRawPayment(rawPayment);
        console.log('Sent payment: ' + payment.paymentHash);
        let result = await ifc.server.sendPayments([payment]);

        if (result.ok) {
            ifc.client.savePayment(payment);
        } else {
            console.log(result.message);
            console.log('start resending');
            if (result.code == 1) {
                var rawPayment = ifc.client.makeRawPayment(0, 0, data, ifc.sidechain.getLatestStageHeight() + 2);
                await ifc.client.saveRawPayment(rawPayment);
                let payment = ifc.server.signRawPayment(rawPayment);
                console.log('Sent payment: ' + payment.paymentHash);
                result = await ifc.server.sendPayments([payment]);

                if (result.ok) {
                    console.log('resend success');
                    ifc.client.savePayment(payment);
                }
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
                    console.log("Add new stage event")
                    let stageHash = result.args._stageHash;
                    let rootHash = result.args._rootHash;
                    console.log('stageHash: ' + stageHash);
                    console.log('rootHash: ' + rootHash);

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
                couldGracefulShotdown = true;
            } catch (e) {
                if (e.message === 'Payments are empty.') {
                    console.error(e);
                    couldGracefulShotdown = true;
                }
                console.error(e);
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
