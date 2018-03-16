let env = require('./env');
let express = require('express');
let bodyParser = require('body-parser');
let cors = require('cors');
let IFCBuilder = require('infinitechain_nodejs');
let path = require('path');
let runClient = require('./client');
let app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(cors());

var server = require('http').createServer(app);

let ifc = new IFCBuilder().setNodeUrl(env.nodeUrl).
                           setWeb3Url(env.web3Url).
                           setSignerKey(env.signerKey).
                           setCipherKey(env.cipherKey).
                           build();

app.post('/send', async function (req, res) {
    try {
        let rawPayment = req.body.rawPayment;
        let payment = ifc.server.signRawPayment(rawPayment);
        console.log('Sent payment: ' + payment.paymentHash);
        let result = await ifc.server.sendPayments([payment]);
        if (result.ok) {
            res.send({ ok: true, payment: payment });
        } else {
            res.send(result);
        }
    } catch (e) {
        console.log(e);
        res.status(500).send({ errors: e.message });
    }
});

app.post('/commit', async function (req, res) {
    try {
        let data = req.body.data;
        let txHash = await ifc.server.commitPayments(10, 0, data);
        console.log('Committed txHash: ' + txHash);
        res.send({ ok: true, txHash: txHash });
    } catch (e) {
        console.log(e);
        res.status(500).send({ errors: e.message });
    }
});

app.post('/finalize', async function (req, res) {
    try {
        let stageHeight = req.body.stageHeight;
        let txHash = await ifc.server.finalize(stageHeight);

        res.send({ ok: true, txHash: txHash });
    } catch (e) {
        console.log(e);
        res.status(500).send({ errors: e.message });
    }
});

server.listen(3001, async function () {
    try {
        console.log('App listening on port 3001!');
        runClient();
    } catch (e) {
        console.error(e.message);
    }
});
