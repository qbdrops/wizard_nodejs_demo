let express = require('express');
let bodyParser = require('body-parser');
let cors = require('cors');
let wizard = require('wizard_nodejs');
let Util = require('ethereumjs-util');
let env = require('./env');

let app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors());

let server = require('http').createServer(app);

let InfinitechainBuilder = wizard.InfinitechainBuilder;
let LightTransaction = wizard.LightTransaction;

let serverAddress = '0x' + Util.privateToAddress(Buffer.from(env.signerKey, 'hex')).toString('hex');
let infinitechain = new InfinitechainBuilder()
  .setNodeUrl(env.nodeUrl)
  .setWeb3Url(env.web3Url)
  .setSignerKey(env.signerKey)
  .setStorage('memory')
  .build();

initialize = async () => {
  infinitechain.initialize().then(() => {
    console.log(serverAddress);
    infinitechain.contract.web3()._provider.on('end', () => {
      console.log('Try to reconnect to: ' + env.web3Url + ' ...');
      new Promise((resolve) => setTimeout(resolve, 5000)).then(initialize);
    });
  }).catch(e => {
    console.log(e, 'Try to reconnect to: ' + env.web3Url + ' ...');
    new Promise((resolve) => setTimeout(resolve, 5000)).then(initialize);
  });
}

initialize();

// two phase termination
let couldGracefulShotdown = true;
let types = {
  deposit: 0,
  withdrawal: 1,
  instantWithdrawal: 2,
  remittance: 3
};

app.post('/pay', async function (req, res) {
  try {
    let lightTxJson = req.body;
    let lightTx = new LightTransaction(lightTxJson);
    console.time(lightTx.lightTxHash);
    let metadataServer = {
      a: 111
    };
    lightTx = await infinitechain.server.addServerMetadata(lightTx, metadataServer);
    if(lightTx.metadata.server) {
      lightTx.metadata.server = '';
    }
    let signedLightTx = infinitechain.signer.signWithServerKey(lightTx);
    let receipt = await infinitechain.server.sendLightTx(signedLightTx);
    let isSent = true;
    if (receipt.type() != types.remittance) {
      isSent = await infinitechain.server.sendReceipt(receipt);
    }
    console.timeEnd(lightTx.lightTxHash);
    if (isSent) {
      res.send(receipt);
    } else {
      res.status(500).send({ errors: 'Transaction was failed' });
    }
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
