// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

contract CarGo {
    uint256 constant DEPOSIT = 100000000000000;
    address constant SERVICE_PROVIDER = //0xfe0738A845DCEc5166378e1b4a735709DF57e0e3;
        0xd187E168bb36C41d767435Eb61E45ba08E29fC86;

    mapping(uint256 => uint256) carBalance;
    mapping(uint256 => uint256) startTime;
    mapping(uint256 => uint256) carPrice;
    mapping(uint256 => uint256) extraTime; //the extra time the renter asks for
    mapping(uint256 => uint256) extraTimeCharge; //the fee that the extra time is charged
    mapping(uint256 => address) carOwner;
    mapping(uint256 => address) carRenter; 
    mapping(uint256 => address) carAdress; //used to check if the car signed the timestamps
    mapping(uint256 => bool) carOccupied; //set to true when the renter has accessed the car
    mapping(uint256 => string) accessToken;
    mapping(uint256 => bool) carBooked; //set to true when the renter has booked the car but not entered yet (set to false when the renter has finished the ride)
    mapping(uint256 => uint256) maxBookTime; //max time the renter can book the car for

    // retner attributes
    mapping(address => uint256) renterBalance;
    mapping(address => bool) renterOccupied;

    modifier checkDeposit() {
        require(msg.value >= DEPOSIT, "NOT ENOUGH DEPOSIT");
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
            "NOT SIGNED BY THE SERVICE PROVIDER"
        );
        carBalance[_carID] = msg.value;
        carOwner[_carID] = msg.sender;
        carPrice[_carID] = _price;
        extraTimeCharge[_carID] = _extraPrice;
        carOccupied[_carID] = false;
        carBooked[_carID] = false;
        carAdress[_carID] = _carAdress;
    }

    // Register renter on-chain
    function registerRenter(
        bytes32 _hash,
        bytes32 _r,
        bytes32 _s,
        uint8 _v
    ) external payable checkDeposit {
        require(
            isSignatureValid(SERVICE_PROVIDER, _hash, _v, _r, _s),
            "NOT SIGNED BY THE SERVICE PROVIDER"
        );
        renterBalance[msg.sender] = msg.value;
        renterOccupied[msg.sender] = false;
    }

    function setAccessToken(
        uint256 _carID,
        string memory _cid,
        address _renter,
        uint256 _maxBookTime
    ) external {
        require(carOccupied[_carID] == false, "CAR IS USED");
        require(msg.sender == carOwner[_carID], "YOU ARE NOT THE OWNER");
        require(carBooked[_carID] == false, "CAR HAS A POTENTIAL DRIVER");
        accessToken[_carID] = _cid;
        carRenter[_carID] = _renter;
        carBooked[_carID] = true; // safeguard to avoid double bookings of same car
        maxBookTime[_carID] = _maxBookTime;  // specifies the max booking time
    }

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
        require(msg.sender == carRenter[_carID], "YOU ARE NOT THE CURRENT RENTER");
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
        uint256 fee = carPrice[_carID] * (_endTime - startTime[_carID]);
        if (extraTime[_carID] > 0) fee += extraTime[_carID] * extraTimeCharge[_carID];
        carBalance[_carID] += fee;
        carOccupied[_carID] = false;
        carBooked[_carID] = false;
        renterBalance[msg.sender] -= fee;
        renterOccupied[msg.sender] = false;
    }

    function cancelBooking(uint256 _carID) external {
        require(carOccupied[_carID] == false, "CAR IS USED");
        require(msg.sender == carRenter[_carID], "YOU ARE NOT THE RENTER");
        accessToken[_carID] = "";
        carRenter[_carID] = address(0);
        carBooked[_carID] = false; // the car returns to available state
    }
   

   function forceEnding(uint256 _carID) external {
    require(msg.sender == carOwner[_carID], "YOU ARE NOT THE OWNER");
    require(startTime[_carID] + maxBookTime[_carID] < block.timestamp, "RENTER HAS NOT EXCEEDED MAX RENT TIME");

    carBalance[_carID] += renterBalance[carRenter[_carID]]; // get renter balance
   }

   function withdrawMoneyToOwner(uint256 _carID) external {
        require(msg.sender == carOwner[_carID], "YOU ARE NOT THE OWNER");
        require(carOccupied[_carID] == false, "CANT WITHDRAW WHEN RENTER IS STILL DRIVING");

        uint256 _amount = carBalance[_carID];
        carBalance[_carID] = 0;
        address _to = carOwner[_carID];

        payable(_to).transfer(_amount);
    }

    function withdrawMoneyToRenter() external {
        require(
            renterOccupied[msg.sender] == false,
            "CANT WITHDRAW WHEN RENTER IS STILL DRIVING"
        );
        uint256 _amount = renterBalance[msg.sender];
        renterBalance[msg.sender] = 0;
        address _to = msg.sender;
        payable(_to).transfer(_amount);
    }

    // Helper functions for debugging
    function getAccessToken(uint256 _carID) external view returns (string memory)
    {
        return accessToken[_carID];
    }

    function getCarOwner(uint256 _carID) external view returns (address)
    {
        return carOwner[_carID];
    }

    function getCarRenter(uint256 _carID) external view returns (address)
    {
        return carRenter[_carID];
    }
}