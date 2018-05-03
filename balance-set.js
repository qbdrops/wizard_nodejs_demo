let assert = require('assert');

class BalanceSet {
  constructor () {
    this.balanceSet = {};
  }
  
  getBalance (address) {
    if (this.balanceSet[address]) {
      return this.balanceSet[address];
    } else {
      return '0000000000000000000000000000000000000000000000000000000000000000';
    }
  }

  setBalance (address, balance) {
    assert((typeof balance === 'string') && (balance.toString().length === 64), 'Invalid balance.');
    try {
      let balances = this.balanceSet;
      balances[address] = balance;
      this.balanceSet[address] = balance;
    } catch(e) {
      console.error(e);
      throw new Error('Fail to update balances.');
    }
  }
}

module.exports = BalanceSet;
