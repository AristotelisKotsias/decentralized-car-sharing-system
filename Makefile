deploy-ganache:
	@echo "Deploying to Ganache testnet. . ."
	@bash build/build.sh ganache
	

deploy-rinkeby:
	@echo "Deploying to Ethereum Rinkeby testnet. . ."
	@bash build/build.sh rinkeby

deploy-arbitrum:
	@echo "Deploying to Arbitrum Rinkeby testnet. . ."
	@bash build/build.sh arbitrum

deploy-optimism:
	@echo "Deploying to Optimism Kovan testnet. . ."
	@bash build/build.sh optimism