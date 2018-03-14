var level = require('level');
var db = level('./db');
var IFCBuilder = require('infinitechain_nodejs');
var axios = require('axios');
let env = require('./env');
let fs = require('fs');

var ifc = new IFCBuilder().setNodeUrl(env.nodeUrl).
                           setWeb3Url(env.web3Url).
                           setSignerKey(env.signerKey).
                           setCipherKey(env.cipherKey).
                           setStorage('level', db).
                           setClientAddress('0x49aabbbe9141fe7a80804bdf01473e250a3414cb').
                           setServerAddress('0x5b9688b5719f608f1cb20fdc59626e717fbeaa9a').
                           build();

var pkClient = '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEApFTF001PG7etLof0Oi8L\nYll3NApmlEw3Zz9zaitDbSAOcDv6L0yfpK4Kgg7Be/llQeaHAWifNnrewFhzKeid\nUZ9rZVZwZoOmbo7OaGdq+z+7VJxmkiJtZ6mD9BWxtjEVFQ3VByqmUc5v/8o7BaKh\nFGaxGMgmH8mwlPFJTXsVRRMb7Mdxp7PC4vkdUH2jorqmOreWEOMIbhVjHQAcVXIs\nseO1r1c2/4ZQIU3ofZMl8o6t4ldJRb9Y7y1xB7J4Egd4ClKCFoM9nQD7oCCN2ADW\nqkTDO91W0jVvx8OfUTEJlM+JiHODIYV8Oq+6sQJUe7rr/t9W7mp0I5UnaOo9HzoO\ncQIDAQAB\n-----END PUBLIC KEY-----';
var pkStakeholder = '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEApFTF001PG7etLof0Oi8L\nYll3NApmlEw3Zz9zaitDbSAOcDv6L0yfpK4Kgg7Be/llQeaHAWifNnrewFhzKeid\nUZ9rZVZwZoOmbo7OaGdq+z+7VJxmkiJtZ6mD9BWxtjEVFQ3VByqmUc5v/8o7BaKh\nFGaxGMgmH8mwlPFJTXsVRRMb7Mdxp7PC4vkdUH2jorqmOreWEOMIbhVjHQAcVXIs\nseO1r1c2/4ZQIU3ofZMl8o6t4ldJRb9Y7y1xB7J4Egd4ClKCFoM9nQD7oCCN2ADW\nqkTDO91W0jVvx8OfUTEJlM+JiHODIYV8Oq+6sQJUe7rr/t9W7mp0I5UnaOo9HzoO\ncQIDAQAB\n-----END PUBLIC KEY-----';

let sendIndex = (quotes) => {
    let count = 0

    let intervalID = setInterval(async () => {
        count++;
        let index = mean(quotes);
        let weightedIndex = weightedMean(quotes);
        console.log('Index: ' + index);
        console.log('Weighted Index: ' + weightedIndex);
        quotes = nextQuotes(quotes);

        var rawPayment = ifc.client.makeRawPayment(0, count, { index: index, weightedIndex: weightedIndex, timestamp: (new Date()).toString(), pkClient: pkClient, pkStakeholder: pkStakeholder });
        await ifc.client.saveRawPayment(rawPayment);
        let res = await axios.post('http://localhost:3001/send', { rawPayment: rawPayment });

        if (res.data.ok) {
            let payment = res.data.payment;
            let result = await ifc.client.verifyPayment(payment);
            if (result) {
                ifc.client.savePayment(payment);
            }
        } else {
            console.log(res.data.message);
        }
    }, 2000);
}

// Manipulate the volume and price randomly
let nextQuotes = quotes => {
    return quotes.map(quote => {
        let sign = (Math.random() > 0.5);
        let volBias = Math.random() * 5;
        let qBias = Math.random() * 0.05;
        let vol = sign ? (quote.volume + volBias) : (quote.volume - volBias);
        vol = Math.round((vol < 0) ? 0 : vol);
        let q = sign ? (quote.price + qBias) : (quote.price - qBias);
        q = Math.round(((q < 0) ? 0 : q) * 100) / 100;
        let r = {
            id: quote.id,
            volume: vol,
            price: q
        };
        return r;
  })
}

// Compute arithmetic mean
let mean = (quotes) => {
    let r =  quotes.reduce((acc, curr) => acc + curr.price, 0) / quotes.length;
    return Math.round(r * 1000) / 1000;
}

// Compute weighted arithmetic mean
let weightedMean = (quotes) => {
    let divisor = quotes.reduce((acc, curr) => acc + (curr.price * curr.volume), 0);
    let divider = quotes.reduce((acc, curr) => acc + curr.volume, 0);
    let r = divisor / divider;
    return Math.round(r * 1000) / 1000;
}

// Watch blockchain event
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
                    console.log(e);
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
watchBlockchainEvent();

// Select company whose CICS level code equals 6
// Read quotes from file
fs.readFile('./data/company.csv', (err, content) => {
    let companies = content.toString().split('\r\n');
    companies.shift();
    let ids = companies.filter(company => {
        let col = company.split(',')[2];
        return (col == 6)
    }).map(company => company.split(',')[0].padStart(6, '0'));

    fs.readFile('./data/quotes.csv', (err, content) => {
        let quotes = content.toString().split('\r\n')
        quotes.shift();
        quotes = quotes.filter(quote => {
            let n = quote.split(',')[0].split('.')[0];
            return ids.includes(n);
        }).map(quote => {
            let [id, volume, price] = quote.split(',');
            return {
                id: id,
                volume: parseInt(volume),
                price: parseFloat(price)
            }
        })
        sendIndex(quotes);
    })
});
