let env = require('./env');
let express = require('express');
let bodyParser = require('body-parser');
let cors = require('cors');
let wizard = require('wizard_nodejs');
let InfinitechainBuilder = wizard.InfinitechainBuilder;
let LightTransaction = wizard.LightTransaction;

let Util = require('ethereumjs-util');

let app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors());

let server = require('http').createServer(app);

let serverAddress = '0x' + Util.privateToAddress(Buffer.from(env.signerKey, 'hex')).toString('hex');
console.log(serverAddress);
let infinitechain = new InfinitechainBuilder()
  .setNodeUrl('http://0.0.0.0:3000')
  .setWeb3Url('http://0.0.0.0:8545')
  .setSignerKey('2058a2d1b99d534dc0ec3e71876e4bcb0843fd55637211627087d53985ab04aa')
  .setStorage('memory')
  .build();

infinitechain.initialize().then(() => {
  infinitechain.event.onProposeDeposit(async (err, r) => {
    console.log('deposit: ');
    console.log(r);

    try {
      let lightTx = LightTransaction.parseProposeDeposit(r.args);
      let signedLightTx = infinitechain.signer.signWithServerKey(lightTx);
      let receipt = await infinitechain.server.sendLightTx(signedLightTx);
      let signedReceipt = infinitechain.signer.signWithServerKey(receipt);
      let txHash = await infinitechain.server.deposit(signedReceipt);
      console.log(txHash);
    } catch (e) {
      console.error(e);
    }
  });

  infinitechain.event.onProposeWithdrawal((err, r) => {
    console.log('withdrawal: ');
    console.log(r);
  });
});

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
      let keys = infinitechain.crypto.keyInfo();
      let data = { quotes: quotes, index: index, weightedIndex: weightedIndex, pkClient: keys.rsaPublicKey, pkStakeholder: keys.rsaPublicKey };
      let rawPayment = await infinitechain.client.makeRawPayment(0, 0, data);
      await infinitechain.client.saveRawPayment(rawPayment);
      // Send rawPayment to Node
      let payment = infinitechain.server.signRawPayment(rawPayment);
      result = await infinitechain.server.sendPayments([payment]);
      ok = result.ok;
    
      if (ok) {
        console.log('Sent payment: ' + payment.paymentHash);
        await infinitechain.client.savePayment(payment);
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

server.listen(3001, async function () {
  try {
    console.log('App listening on port 3001!');
  } catch (e) {
    console.error(e.message);
  }
});

if (process.platform === 'win32') {
  let rl = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.on('SIGINT', function () {
    process.emit('SIGINT');
  });
}

process.on('SIGINT', function () {
  if (couldGracefulShotdown) {
    process.exit();
  }

  setInterval(() => {
    process.exit();
  }, 1000);
});
