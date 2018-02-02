let env = require('./env');
let express = require('express');
let bodyParser = require('body-parser');
let cors = require('cors');
let IFCBuilder = require('infinitechain_nodejs');
let path = require('path');

let app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(cors());

var server = require('http').createServer(app);

let ifc = new IFCBuilder().setNodeUrl(env.nodeUrl).setWeb3Url(env.web3Url).setSignerKeypair(env.signerKey).setCipherKeypair(env.cipherKey).build();

app.post('/send', async function (req, res) {
    try {
        console.log(req.body);
        let rawPayment = req.body.rawPayment;
        let payment = ifc.server.signRawPayment(rawPayment);
        ifc.server.sendPayments([payment]).then(console.log);

        res.send({ payment: payment });
    } catch (e) {
        console.log(e);
        res.status(500).send({ errors: e.message });
    }
});

app.post('/commit', async function (req, res) {
    try {
        let data = req.body.data;
        ifc.server.commitPayments(300, 0, data).then(console.log);

        res.send({ ok: true });
    } catch (e) {
        console.log(e);
        res.status(500).send({ errors: e.message });
    }
});

app.post('/finalize', async function (req, res) {
    try {
        let stageHeight = req.body.stageHeight;
        ifc.server.finalize(stageHeight).then(console.log);

        res.send({ ok: true });
    } catch (e) {
        console.log(e);
        res.status(500).send({ errors: e.message });
    }
});

server.listen(3001, async function () {
    try {
        console.log('App listening on port 3001!');
    } catch (e) {
        console.error(e.message);
    }
});
