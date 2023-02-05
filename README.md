# Quickstart

## Install truffle globally

`npm install -g truffle`

## Download Ganache

Mac: `Ganache-*.dmg`

### truffle-config.js

This is the configuration file where you can specify the compiler version and the network. We use ganache at the moment which is running at 127.0.0.1:7545

```js
module.exports = {
  networks: {
    development: {
      host: "127.0.0.1",
      port: 7545,
      network_id: "*", // Match any network id
    },
  },
  compilers: {
    solc: {
      version: "^0.8.9",
    },
  },
};


## Configuration
Ganache provides public and private keys together with addresses.
Create a .env file and place all the secret information such as keys and connection URLs in that file. For example:

```

GANACHE_URL = "http://127.0.0.1:7545"
GANACHE_PROVIDER_PKEY = <<private key>>
GANACHE_OWNER_PKEY = <<private key>>
GANACHE_RENTER_PKEY = <<private key>>

````


# How to run

In order to deploy the contract to ganache:

```bash
make deploy-ganache
````

The deploy logs are saved in build/logs folder

In order to run the client:

```bash
cd client/src
node ganache.js
```
