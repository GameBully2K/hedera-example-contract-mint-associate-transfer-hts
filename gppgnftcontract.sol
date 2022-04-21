// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.7.0 <0.9.0;
pragma experimental ABIEncoderV2;

import "./hip-206/HederaTokenService.sol";
import "./hip-206/HederaResponseCodes.sol";


contract gppgnftcontract is HederaTokenService {

    address client;
    address tokenAddress;
    address[] escrow;
    int64 nftTotalSupply;
    address[] stakers;
    uint startTime;
    mapping (address => uint) joinTime;
    mapping (int64 => address) staking;
    mapping (address => uint) balance;
    mapping (address => int64[]) public staked;
    mapping (address => int64[]) public unstaked;

    // modifier onlyClient() {
        //     require(msg.sender == client)
        // }

    constructor(/*address _client, */address _tokenAddress, address _escrow, int64 total) {
        tokenAddress = _tokenAddress;
        escrow.push(_escrow);
        nftTotalSupply = total;
        startTime = block.timestamp;
        client = msg.sender;
    }
    fallback () external payable {
        // No fallback code yet
    }
    receive() external payable {
        // No receiving code yet
    }
    
    modifier onlyClient() {
        require(msg.sender == client, "Admin only");
        _;
    }

    function getClient() public view returns(address add) {
        return client;
    }
    function getBalance(address addr) public view returns(uint) {
        return balance[addr];
    }

    function getJoinTime(address addr) public view returns(uint) {
        return joinTime[addr];
    }

    function getstaked(address addr) public view returns(int64[] memory) {
        return staked[addr];
    } 
    
    //the use of this function is not mendatory in the frontend it just makes sense to add it
    function getunstaked(address addr) public view returns(int64[] memory) {
        return unstaked[addr];
    }

    // this function count array length for populated fields
    function noc(int64[] memory arr) internal pure returns (uint r) {
        for (uint i = 0 ; i < arr.length ; i++) {
            if (arr[i] > 0) r++;
        }
    }

    // function deleteunstacked(address _stacker, int64[] memory _serialNumber) internal {
        
    // }

    function mintNFT(uint64  amount, bytes[] memory _meta ) external {
        (int response, uint64 newTotalSupply, int64[] memory serialNumbers) = HederaTokenService.mintToken(tokenAddress, amount, _meta );
        if (response != HederaResponseCodes.SUCCESS) {
            revert ("Mint Failed");
        }
    }

    function tokenAssociate(address _account) external {
        int response = HederaTokenService.associateToken(_account, tokenAddress);

        if (response != HederaResponseCodes.SUCCESS) {
            revert ("Associate Failed");
        }
    }
    address[] sens;
    address[] recs;
    function NFTTransfer(address  _sender, address  _receiver, int64[] memory _serialNumber) external {        
        sens.push(_sender);
        recs.push(_receiver);
        int response = HederaTokenService.transferNFTs(tokenAddress, sens, recs, _serialNumber);

        if (response != HederaResponseCodes.SUCCESS) {
            
        }
        sens.pop();
        recs.pop(); 
    }

    function stake( address  _sender, int64[] memory _serialNumber) public {
        require(_serialNumber[0] != 0,"No NFTs selected");
        sens.push(_sender);
        int response = HederaTokenService.transferNFTs(tokenAddress, sens, escrow , _serialNumber);
        if (response != HederaResponseCodes.SUCCESS) {
            //add staker if not added
            
        }
        bool exist = false;
        for (uint i=0; i < stakers.length; i++) {
            if (stakers[i] == _sender) exist=true;
        }
        if (!exist) {
            stakers.push(_sender);
            joinTime[_sender] = block.timestamp;
            }
        //linking staked assets with staker address
        for (uint i=0; i < _serialNumber.length ; i++) {
            staking[_serialNumber[i]]=_sender;
            staked[_sender].push(_serialNumber[i]);
        }

        int64[] memory num  = unstaked[_sender];
        for (uint i=0;i < num.length; i++) {
            for (uint j=0; j < _serialNumber.length; j++) {
                if (num[i] == _serialNumber[j]) delete unstaked[_sender][i];
            }
        }
        sens.pop();
        
    }

    function unstake( address  _receiver, int64[] memory _serialNumber) public {
        recs.push(_receiver);
        int response = HederaTokenService.transferNFTs(tokenAddress, escrow, recs , _serialNumber);
        if (response != HederaResponseCodes.SUCCESS) {
            revert ('Transfer Failed');
        }
        require(_serialNumber[0] != 0,"No NFTs selected");
            
        for (uint i=0; i < _serialNumber.length; i++) {
            staking[_serialNumber[i]]= 0x0000000000000000000000000000000000000000;
            unstaked[_receiver].push(_serialNumber[i]);
        }

        //deleteunstacked(_receiver,_serialNumber);
        for (uint j = 0 ; j < staked[_receiver].length ; j++) {
            for (uint i =0 ; i < _serialNumber.length ; i++) {
                if (staked[_receiver][j] == _serialNumber[i]) {
                    staked[_receiver][j] = 0;
                }
            }
        }

        //removing the stacker if he doen't have any staked assets
        if (noc(staked[_receiver]) == 0) {
            uint no = stakers.length-1;
            for (uint i=0; i < stakers.length; i++) {
                if (stakers[i] == _receiver) {
                    stakers[i] = stakers[no];
                    stakers.pop();
                }
            }
        }
        recs.pop();
    }

    uint weekcount;
    uint daycount;
    function addDay () public {
        daycount++;
    }
    
    function minusDay () public {
        daycount--;
    }

    function updateReward() public payable {
        uint amount = msg.value;
        uint share;
        for ( uint i = 0 ; i < stakers.length; i++) {
            share = noc(staked[stakers[i]]) *100;
            share = (share / stakers.length);
            balance[stakers[i]] += (amount*share)/100;
        }
        //since did function updates daily
        daycount++;
        // uint o = weekcount;
        // weekcount = daycount%7;
        // weekcount = daycount - weekcount;    //switched from weekly to dayli
        // weekcount = weekcount / 7;
        // if (o != weekcount) {
        for ( uint i = 0 ; i < stakers.length; i++) withdrawed[stakers[i]] = false;
        // }

    }

    function addBonus() public payable {
        uint amount = msg.value;
        uint share;
        for ( uint i = 0 ; i < stakers.length; i++) {
            share = noc(staked[stakers[i]]) *100;
            share = (share / stakers.length);
            balance[stakers[i]] += (amount*share)/100;
        }
    }

    mapping (address => bool) withdrawed;

    function withdawl() public payable {
        require ((joinTime[msg.sender] - block.timestamp) < 604800);
        require (block.timestamp > (startTime+weekcount*604800));
        require (!withdrawed[msg.sender]);
        withdrawed[msg.sender] = true;
        (bool os, ) = payable(msg.sender).call{value: balance[msg.sender] }("");
            require(os);
    }
    
    //withdraw function
    



}


