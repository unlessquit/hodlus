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
          minimumFractionDigits: 0,
          maximumFractionDigits: 8
        };
      }

      return {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      };
    }
  },
  render: function (h) {
    return h(
      'span', {attrs: {'class': 'amount'}},
      [this.amount.toLocaleString(navigator.languages, this.options), ' ', this.currency]);
  }
});

var app = new Vue({
  el: '#app',
  data: {
    hash: '',
    balance: null,
    currency: 'USD',
    addresses: [],
    rates: null,
    error: null
  },
  computed: {
    rate: function () {
      return this.rates && parseInt(this.rates[this.currency], 10);
    },
    converted: function () {
      console.debug('Converting.');
      if (this.balance === null) return null;
      if (this.rate === null) return null;

      return Math.floor(this.balance * this.rate);
    }
  },
  watch: {
    error: function () {
      console.error(this.error);
    },
    addresses: function () {
      console.debug('Fetching balance...');
      if (this.addresses.length === 0) {
        this.balance = 0;
        return;
      }

      fetch('https://blockchain.info/q/addressbalance/' + this.addresses.join('|') + '?cors=true')
        .then(r => r.text())
        .then(balance => this.balance = parseInt(balance, 10) / 100000000)
        .catch(error => {
          console.error('Failed to fetch balance:', error);
          this.error = 'Failed to fetch balance.';
        })
        .then(() => console.debug('Done.'));
    }
  },
  render: function (h) {
    if (this.error) {
      return h('center', [
        h('h1', ['Error']),
        h('div', [JSON.stringify(this.error)]),
      ]);
    };

    return h('center', [
      h('div', [
        h('h1', ["You are hodling"]),
        when(
          this.balance !== null,
          () => [
            h('div', {attrs: {class: 'bitcoin-balance'}}, [
              h('amount', {props: {amount: this.balance, currency: 'BTC'}}),
              h('div', {attrs: {'class': 'addresses-count'}}, ['on ', this.addresses.length, this.addresses.length > 1 ? ' addresses' : ' address']),
            ])
          ]
        ),
        h('div', [
          when(
            this.converted,
            () => [
              h('h2', ['Which equals to']),
              h('em', [
                h('amount', {props: {amount: this.converted, currency: this.currency, primary: true}})
              ])
            ]
          )
        ]),
        when(
          this.rate,
          () => [
            h('div', {attrs: {class: 'current-rate'}}, [
              h('amount', {props: {amount: 1, currency: 'BTC'}}), ' = ',
              h('amount', {props: {amount: this.rate, currency: this.currency}})
            ])
          ]
        )
      ])
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
).then(res => res.json()).then(json => app.rates = json.data.rates).catch(error => {
  console.error('Failed to fetch rates:', error);
  app.error = 'Failed to fetch rates.';
});
