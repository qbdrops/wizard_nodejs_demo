var axios = require('axios');
let fs = require('fs');

let sendIndex = (quotes) => {
    let intervalID = setInterval(async () => {
        let index = mean(quotes);
        let weightedIndex = weightedMean(quotes);
        let result = await axios.post('http://localhost:3001/quotes', { quotes: quotes, index: index, weightedIndex: weightedIndex });
        quotes = nextQuotes(quotes);
        console.log(result.data);
    }, 1000);
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

// Select company whose CICS level code equals 6
// Read quotes from file
let runClient = () => {
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
}

runClient();
