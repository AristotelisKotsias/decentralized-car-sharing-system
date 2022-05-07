#!/bin/bash
cd truffle/
truffle migrate --reset --network $1 > ../build/logs/$1.out
#cd ..
#python3 build/get_contract_address.py build/logs/$1.out