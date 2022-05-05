// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

contract CarGo {
    uint256 constant DEPOSIT = 0.0001 ether;
    uint256 constant PENALTY = 0.00001 ether;
    address constant SERVICE_PROVIDER =0xd187E168bb36C41d767435Eb61E45ba08E29fC86;
        //0xd187E168bb36C41d767435Eb61E45ba08E29fC86;

    mapping(uint256 => uint256) carBalance;
    mapping(uint256 => uint256) startTime;
    mapping(uint256 => uint256) carPrice;
    mapping(uint256 => uint256) extraTime;
    mapping(uint256 => uint256) extraTimeCharge;
    mapping(uint256 => address) carOwner;
    mapping(uint256 => address) carRenter; // this links the renter with the car
    mapping(uint256 => address) carAdress;
    mapping(uint256 => bool) carOccupied;
    mapping(uint256 => string) accessToken;

    // retner attributes
    mapping(address => uint256) renterBalance;
    mapping(address => bool) renterOccupied;

    // event RegisterCar(uint256 _carID, uint256 _price, uint256 _extraPrice);
    // event RegisterRenter(address _address);
    // event InitBooking(address _address);
    // event EndBooking(address _address, uint256 _endTime);

    modifier checkDeposit() {
        require(msg.value >= DEPOSIT, "Not enough Ether provided as deposit");
        _;
    }

    function isSignatureValid(
        address _address,
        bytes32 _hash,
        uint8 _v,
        bytes32 _r,
        bytes32 _s
    ) private pure returns (bool) {
        address _signer = ecrecover(_hash, _v, _r, _s);
        return (_signer == _address);
    }

    function registerCar(
        address _carAdress,
        uint256 _carID,
        uint256 _price,
        uint256 _extraPrice,
        bytes32 _hash,
        bytes32 _r,
        bytes32 _s,
        uint8 _v
    ) external payable checkDeposit {
        require(
            isSignatureValid(SERVICE_PROVIDER, _hash, _v, _r, _s),
            "NOT SIGNED BY SERVICE PROVIDER"
        );
        carBalance[_carID] = msg.value;
        carOwner[_carID] = msg.sender;
        carPrice[_carID] = _price;
        extraTimeCharge[_carID] = _extraPrice;
        carOccupied[_carID] = false;
        carAdress[_carID] = _carAdress;
        //emit RegisterCar(_carID, _price, _extraPrice);
    }

    // Register retner on-chain
    function registerRenter(
        bytes32 _hash,
        bytes32 _r,
        bytes32 _s,
        uint8 _v
    ) external payable checkDeposit {
        require(
            isSignatureValid(SERVICE_PROVIDER, _hash, _v, _r, _s),
            "NOT SIGNED BY SERVICE PROVIDER"
        );
        renterBalance[msg.sender] = msg.value;
        //emit RegisterRenter(msg.sender);
    }

    function setAccessToken(
        uint256 _carID,
        string memory _cid,
        address _renter
    ) external {
        require(carOccupied[_carID] == false, "CAR IS USED");
        require(msg.sender == carOwner[_carID], "YOU ARE NOT THE OWNER");
        accessToken[_carID] = _cid;
        carRenter[_carID] = _renter;
    }

    function getAccessToken(uint256 _carID)
        external
        view
        returns (string memory)
    {
        return accessToken[_carID];
    }

    // Check that car is not in use, car signed the beginTime and that the correct driver
    function beginBooking(
        bytes32 _hash,
        uint8 _v,
        bytes32 _r,
        bytes32 _s,
        uint256 _carID,
        uint256 _beginTime
    ) external {
        require(msg.sender == carRenter[_carID], "YOU ARE NOT THE RENTER");
        require(
            isSignatureValid(carAdress[_carID], _hash, _v, _r, _s),
            "TIME WAS NOT SIGNED BY THE CAR"
        );
        startTime[_carID] = _beginTime;
        carOccupied[_carID] = true;
        renterOccupied[msg.sender] = true;
    }

    function setExtraTime(uint256 _carID, uint256 _extraTime) external {
        require(msg.sender == carOwner[_carID], "YOU ARE NOT THE OWNER");
        extraTime[_carID] = _extraTime;
    }

    function endBooking(
        uint256 _carID,
        uint256 _endTime,
        bytes32 _hash,
        uint8 _v,
        bytes32 _r,
        bytes32 _s
    ) external {
        require(
            msg.sender == carRenter[_carID],
            "YOU ARE NOT THE CURRENT RENTER"
        );
        require(
            isSignatureValid(carAdress[_carID], _hash, _v, _r, _s),
            "TIME WAS NOT SIGNED BY THE CAR"
        );

        uint256 fee = carPrice[_carID] * (startTime[_carID] - _endTime);

        if (extraTime[_carID] > 0) {
            fee += extraTime[_carID] * extraTimeCharge[_carID];
        }

        carBalance[_carID] += fee;
        carOccupied[_carID] = false;
        renterBalance[msg.sender] -= fee;
        renterOccupied[msg.sender] = false;
        //emit EndBooking(msg.sender, _endTime);
    }

    function cancelBooking(uint256 _carID) external {
        if (msg.sender == carOwner[_carID]) {
            require(
                startTime[_carID] <= 0,
                "Ride has started, you can't cancel it"
            );
            carRenter[_carID] = address(0);
            accessToken[_carID] = "";
        } else if (msg.sender == carRenter[_carID]) {
            if (startTime[_carID] > 0) {
                renterBalance[msg.sender] -= PENALTY;
                uint256 fee = renterBalance[msg.sender] - PENALTY;
                carBalance[_carID] += fee;
                carOccupied[_carID] = false;
                renterOccupied[msg.sender] = false;
            } else {
                carRenter[_carID] = address(0);
                accessToken[_carID] = "";
            }
        }
    }

    function withdrawMoneyToOwner(uint256 _carID) external {
        require(msg.sender == carOwner[_carID], "YOU ARE NOT THE OWNER");
        require(carOccupied[_carID] == false, "CANT WITHDRAW WHEN RENTER IS STILL DRIVING");

        uint256 _amount = carBalance[_carID];
        carBalance[_carID] = 0;
        address _to = carOwner[_carID];

        payable(_to).transfer(_amount);
    }

    function withdrawMoneyToRenter(uint256 _carID) external {
        require(msg.sender == carRenter[_carID], "YOU ARE NOT THE RENTER");
        require(
            renterOccupied[msg.sender] == false,
            "CANT WITHDRAW WHEN RENTER IS STILL DRIVING"
        );
        uint256 _amount = renterBalance[msg.sender];
        renterBalance[msg.sender] = 0;
        payable(msg.sender).transfer(_amount);
    }
}