/* eslint-env browser */
/* global auth0, Auth0Lock, Vue, S2 */

function when(bool, then) {
  return bool ? then() : null;
}

Vue.component('amount', {
  props: ['amount', 'currency'],
  computed: {
    options: function () {
      if (this.currency === 'BTC') {
        return {
          style: "currency",
          currency: this.currency,
          currencyDisplay: "code",
          maximumFractionDigits: 8
        };
      }

      return {
        style: "currency",
        currency: this.currency,
        currencyDisplay: "code"
      };
    }
  },
  render: function (h) {
    return h('div', [this.amount.toLocaleString(navigator.languages, this.options)]);
  }
});

var app = new Vue({
  el: '#app',
  data: {
    hash: '',
    balance: null,
    currency: null,
    addresses: [],
    rates: null
  },
  computed: {
    converted: function () {
      console.log('converting');
      if (this.balance === null) return null;
      if (this.rates === null) return null;

      return Math.floor(this.balance * this.rates[this.currency]);
    }
  },
  watch: {
    addresses: function () {
      console.log('Fetching balance...');
      if (this.addresses.length === 0) {
        this.balance = 0;
        return;
      }

      // TODO: handle error
      fetch('https://blockchain.info/q/addressbalance/' + this.addresses.join('|'))
        .then(r => r.text())
        .then(balance => this.balance = parseInt(balance, 10) / 100000000);
    }
  },
  render: function (h) {
    return h('center', [
      h('h1', ["Balance"]),
      when(
        this.balance,
        () => [
          h('amount', {props: {amount: this.balance, currency: 'BTC'}})
        ]
      ),
      when(
        this.converted,
        () => [
          h('div', ['=']),
          h('amount', {props: {amount: this.converted, currency: this.currency}})
        ]
      )
    ]);
  }
});

function getPartValue (key, defaultValue) {
  var parts = document.location.hash.substr(1).split(';');
  var part = parts.find(function (part) {
    return part.indexOf(key + ':') === 0;
  });

  if (!part) return defaultValue;
  return part.substr(key.length + 1);
}

var prevAddressPart = '';
function processHash() {
  app.currency = getPartValue('currency', 'USD');
  var addressPart = getPartValue('address', '');
  if (addressPart !== prevAddressPart) {
    app.addresses = getPartValue('address', '').split(',');
    prevAddressPart = addressPart;
  }
}

if (document.location.hash) {
  processHash();
}

window.onhashchange = function () {
  processHash();
};

fetch(
  "https://api.coinbase.com/v2/exchange-rates?currency=BTC"
).then(res => res.json()).then(json => app.rates = json.data.rates);
