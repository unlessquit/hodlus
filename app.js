/* eslint-env browser */
/* global auth0, Auth0Lock, Vue, S2 */

var addressLength = 34;

function ifelse(bool, thenFn, elseFn) {
  return bool ? thenFn() : elseFn();
}

function when(bool, thenFn) {
  return bool ? thenFn() : null;
}

function sat2btc(x) {
  return x / 100000000.0;
}

function uniq(xs) {
  return xs.reduce((acc, x) => {
    if (acc.indexOf(x) === -1) acc.push(x);
    return acc;
  }, []);
}

function fetchBalanceBlockchainInfo(addresses) {
  return fetch(
    "https://blockchain.info/q/addressbalance/" +
      uniq(addresses).join("|") +
      "?cors=true"
  )
    .then(r => r.text())
    .then(balance => {
      return { total: sat2btc(parseInt(balance, 10)) };
    });
}

function fetchBalanceBlockexplorer(addresses) {
  var requests = uniq(addresses).map(address =>
    fetch("https://blockexplorer.com/api/addr/" + address + "/balance")
      .then(r => r.text())
      .then(balance => sat2btc(balance))
  );

  return Promise.all(requests).then(balances => {
    var total = balances.reduce((total, balance) => total + balance);
    return { total: total };
  });
}

var fetchBalanceProvider = fetchBalanceBlockexplorer;
// var fetchBalanceProvider = fetchBalanceBlockchainInfo;

Vue.component("fetching...", {
  render: function(h) {
    return h("img", { attrs: { src: "img/fetching.svg" } });
  }
});

Vue.component("current-price", {
  props: ["price", "currency"],
  render: function(h) {
    return h("div", { attrs: { class: "current-rate" } }, [
      h("amount", { props: { value: 1, currency: "BTC" } }),
      " = ",
      h("amount", {
        props: { value: this.price, currency: this.currency }
      })
    ]);
  }
});

Vue.component("amount", {
  props: ["value", "currency"],
  computed: {
    options: function() {
      if (this.currency === "BTC") {
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
  render: function(h) {
    return h("span", { attrs: { class: "amount" } }, [
      this.value.toLocaleString(navigator.languages, this.options),
      " ",
      this.currency
    ]);
  }
});

Vue.component("animated-amount", {
  props: ["value", "currency"],
  data: function() {
    return {
      tweeningValue: 0
    };
  },
  render: function(h) {
    return h("amount", {
      props: { value: this.tweeningValue, currency: this.currency }
    });
  },
  watch: {
    value: function(newValue, oldValue) {
      this.tween(oldValue, newValue);
    }
  },
  mounted: function() {
    this.tween(0, this.value);
  },
  methods: {
    tween: function(startValue, endValue) {
      var vm = this;

      function animate() {
        if (TWEEN.update()) {
          requestAnimationFrame(animate);
        }
      }

      new TWEEN.Tween({ tweeningValue: startValue })
        .to({ tweeningValue: endValue }, 3500)
        .easing(TWEEN.Easing.Quintic.Out)
        .onUpdate(function() {
          vm.tweeningValue = this.tweeningValue;
        })
        .start();

      animate();
    }
  }
});

Vue.component("settings-button", {
  render: function(h) {
    return h("img", {
      attrs: {
        src: "img/gear.svg",
        class: "settings",
        alt: "Settings",
        title: "Settings"
      },
      on: { click: this.onClick }
    });
  },
  methods: {
    animate: function() {
      this.$el.classList.add("spin");
      this.$el.addEventListener("animationend", e =>
        this.$el.classList.remove("spin")
      );
    },
    onClick: function() {
      this.animate();
      this.$emit("click");
    }
  }
});

Vue.component("hodling", {
  props: ["balance", "addresses", "converted", "currency"],
  render: function(h) {
    return h("div", [
      h("h1", ["You are hodling"]),
      h("div", { attrs: { class: "bitcoin-balance" } }, [
        h("amount", { props: { value: this.balance, currency: "BTC" } }),
        h("div", { attrs: { class: "addresses-count" } }, [
          "on ",
          this.addresses.length,
          this.addresses.length > 1 ? " addresses" : " address"
        ])
      ]),
      h("div", [
        h("h2", ["Which equals to"]),
        ifelse(
          this.converted === null,
          () => h("fetching..."),
          () =>
            h("em", [
              h("animated-amount", {
                props: {
                  value: this.converted,
                  currency: this.currency
                }
              })
            ])
        )
      ])
    ]);
  }
});

Vue.component("address-input", {
  props: ["address", "focus"],
  render: function(h) {
    return h("div", { attrs: { class: "new-address" } }, [
      (this.input = h("input", {
        attrs: {
          value: this.address,
          maxlength: addressLength,
          class: "address",
          placeholder:
            "Enter address (e.g., 1EHNa6Q4Jz2uvNExL497mE43ikXhwF6kZm)"
        },
        on: { input: this.onInput }
      }))
    ]);
  },
  mounted: function() {
    if (this.focus) {
      this.input.elm.focus();
    }
  },
  methods: {
    onInput: function(e) {
      var value = e.target.value.trim();
      if (value.length === addressLength) {
        e.target.value = "";
        this.$emit("address", { address: value });
      }
    }
  }
});

Vue.component("address-item", {
  props: ["address"],
  data: function () {
    return {
      deleting: false
    };
  },
  render: function(h) {
    return h("div", { attrs: { class: "address" } }, [
      h("span", { attrs: { class: "address-number" } }, [this.address]),
      h(
        "div",
        {
          attrs: { class: "delete" + (this.deleting ? " delete-confirm" : "") },
          on: { click: this.onDelete }
        },
        [this.deleting ? "Delete?" : h("img", { attrs: { src: "img/x.svg" } })]
      )
    ]);
  },
  methods: {
    onDelete: function(e) {
      if (!this.deleting) {
        this.deleting = true;
        setTimeout(() => this.deleting = false, 5000);
        return;
      }

      this.$emit("delete", { address: this.address });
    }
  }
});

Vue.component("settings", {
  props: ["addresses", "currency", "rates"],
  computed: {
    currencies: function() {
      return Object.keys(this.rates);
    }
  },
  render: function(h) {
    return h("div", { attrs: { class: "settings" } }, [
      h("h1", ["Settings"]),
      h("h2", ["Currency"]),
      h("section", [
        this.rates === null
          ? h("fetching...")
          : h(
              "select",
              { on: { change: e => setPartValue("currency", e.target.value) } },
              [
                this.currencies.map(currency =>
                  h(
                    "option",
                    {
                      attrs:
                        this.currency === currency ? { selected: true } : {}
                    },
                    [currency]
                  )
                )
              ]
            )
      ]),
      h("h2", ["Addresses"]),
      h("section", { attrs: { class: "addresses" } }, [
        h("address-input", {
          key: this.addresses.length + 1,
          props: { focus: true },
          on: { address: this.onCreate }
        }),
        h(
          "transition-group",
          {
            props: {
              "enter-active-class": "animated zoomIn",
              "leave-active-class": "animated zoomOut"
            }
          },
          this.addresses.map(address =>
            h("address-item", {
              key: address,
              props: { address: address },
              on: { delete: this.onDelete }
            })
          )
        )
      ])
    ]);
  },
  methods: {
    onDelete: function(e) {
      console.debug("Deleted:", e.address);
      setPartValue(
        "address",
        this.addresses.filter(a => a !== e.address).join(",")
      );
    },
    onCreate: function(e) {
      var addresses = uniq([e.address].concat(this.addresses));
      setPartValue("address", addresses.join(","));
    }
  }
});

var app = new Vue({
  el: "#app",
  data: {
    showSettings: false,
    balance: null,
    currency: "USD",
    addresses: [],
    rates: null,
    fetchingBalance: false,
    error: null
  },
  computed: {
    rate: function() {
      return this.rates && parseInt(this.rates[this.currency], 10);
    },
    converted: function() {
      console.debug("Converting.");
      if (this.balance === null) return null;
      if (this.rate === null) return null;

      return Math.floor(this.balance * this.rate);
    }
  },
  watch: {
    error: function() {
      console.error(this.error);
    },
    addresses: function() {
      // We are on settings page, there is no need to fetch balance just yet.
      if (this.showSettings) return;

      this.fetchBalance();
    },
    showSettings: function(x) {
      // We are back from settings screen, fetch balance.
      if (!this.showSettings) this.fetchBalance();
    }
  },
  render: function(h) {
    if (this.error) {
      return h("center", [
        h("h1", ["Error"]),
        h("div", [JSON.stringify(this.error)])
      ]);
    }

    var settingsButton = h("settings-button", {
      on: { click: () => this.toggleSettings() }
    });

    if (!this.showSettings) {
      if (this.addresses.length === 0) {
        return h("center", [
          h("h1", ["Configuration needed"]),
          "Use settings button in top right corner to configure HODLus.",
          settingsButton
        ]);
      }

      if (this.balance === null) {
        if (this.fetchingBalance) {
          return h("center", [
            h("h1", ["Fetching balance..."]),
            h("fetching...")
          ]);
        }
        return h("div");
      }
    }

    return h("center", [
      ifelse(
        this.showSettings,
        () =>
          h("settings", {
            props: {
              addresses: this.addresses,
              currency: this.currency,
              rates: this.rates
            }
          }),
        () =>
          h("hodling", {
            props: {
              balance: this.balance,
              addresses: this.addresses,
              converted: this.converted,
              currency: this.currency
            }
          })
      ),
      when(this.rate, () => [
        h("current-price", {
          props: { price: this.rate, currency: this.currency }
        })
      ]),
      settingsButton
    ]);
  },
  methods: {
    toggleSettings: function() {
      this.showSettings = !this.showSettings;
    },
    fetchBalance: function() {
      if (this.addresses.length === 0) {
        this.balance = 0;
        return;
      }

      console.debug("Fetching balance...");

      var finished = false;

      // Only show fetching spinner if it takes too long.
      setTimeout(() => {
        if (!finished) this.fetchingBalance = true;
      }, 1000);

      fetchBalanceProvider(this.addresses)
        .then(result => {
          this.balance = result.total;
          finished = true;
          this.fetchingBalance = false;
          console.debug("Done.");
        })
        .catch(error => {
          console.error("Failed to fetch balance:", error);
          if (this.balance === null) {
            this.error =
              "Failed to fetch balance. Please wait 10 seconds and try again.";
          }
        })
        .then(() => {
          finished = true;
          this.fetchingBalance = false;
          console.debug("Done.");
        });
    }
  }
});

function setPartValue(key, value) {
  var parts = document.location.hash.substr(1).split(";");
  var other = parts.filter(part => part.indexOf(key + ":") !== 0);

  window.location.hash = other.join(";") + ";" + key + ":" + value;
}

function getPartValue(key, defaultValue) {
  var parts = document.location.hash.substr(1).split(";");
  var part = parts.find(function(part) {
    return part.indexOf(key + ":") === 0;
  });

  if (!part) return defaultValue;
  return part.substr(key.length + 1);
}

var prevAddressPart = "";
function processHash() {
  localStorage.setItem("hash", document.location.hash);
  app.currency = getPartValue("currency", "USD");
  var addressPart = getPartValue("address", "");
  if (addressPart !== prevAddressPart) {
    var addresses = addressPart === "" ? [] : addressPart.split(",");
    app.addresses = uniq(addresses);
    prevAddressPart = addressPart;
  }
}

window.onhashchange = function() {
  processHash();
};

var storedHash = window.localStorage && localStorage.getItem("hash");

if (document.location.hash) {
  processHash();
}
else if (storedHash) {
  window.location.hash = localStorage.getItem("hash");
}

function updateRates() {
  console.debug("Updating rates...");
  fetch("https://api.coinbase.com/v2/exchange-rates?currency=BTC")
    .then(res => res.json())
    .then(json => (app.rates = json.data.rates))
    .catch(error => {
      console.error("Failed to fetch rates:", error);
      if (!app.rates) {
        app.error = "Failed to fetch rates. Please try again.";
      }
    })
    .then(() => setTimeout(updateRates, 30000));
}

updateRates();
