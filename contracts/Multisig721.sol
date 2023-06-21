// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";


contract Multisig721 is IERC721Receiver, Ownable{


    // multisig transaction data structure
    struct Transaction {
        // transaction state
        // 0: newly created or invalid
        // 1: transaction requested but yet confirmed
        // 2: transaction confirmed but yet executed
        // 3: transaction executed and succeeded
        // 4: transaction executed but failed
        uint8 state;                 // transaction state
        uint256 txid;                  // transaction id
        uint256 value;                 // token id in erc-721 transaction context
        address requester;          // transaction requester
        address to;                 // tranfer-to address
        address tokenContract;      // token contract address
    }

    // storages
    uint256 private _threshold;
    uint256 private _signerCount;
    uint256 private _txCount;
    uint256 private _maxSignerNum;
    mapping(address=>bool) private _isSigner;
    mapping(uint256=>Transaction) private _transactions;
    mapping(uint256=>mapping(address=>bool)) private _confirmations;


    ////////////////
    //   events   //
    ////////////////
    event ThresholdChanged(uint256 new_threshold);
    event SignerAddition(address indexed signer);
    event SignerRemoval(address indexed signer);
    event NewTransactionRecorded(address indexed requester, uint256 txid, uint256 state);
    event DevIgnoredV(uint256 pos);
    
    

    // constructor
    constructor(uint256 threshold, uint256 maxSignerNum){
        require(threshold > 0, "theshold should be greater than 0");
        require(maxSignerNum > 0, "maximum signer num should be greater than 0");
        
        _threshold = threshold;
        _maxSignerNum = maxSignerNum;
        _signerCount = 0;
        _txCount = 0;
    }

    ///////////////////
    //   modifiers   //
    ///////////////////
    modifier signerOnly() {
        require(_isSigner[msg.sender] == true, "only signer has access");
        _;
    }

    modifier nonsignerOnly() {
        require(_isSigner[msg.sender] == false, "only non-signer has access");
        _;
    }


    // implementations
    function onERC721Received(address, address, uint256, bytes calldata) external pure override returns (bytes4) {
        return this.onERC721Received.selector;
    }


    ////////////////////////////
    //   external functions   //
    ////////////////////////////
    function addSigner(address target) external onlyOwner{
        require(_signerCount < _maxSignerNum, "signer num cannot exceed the limit, please remove one or more signers first");
        require(_isSigner[target] == false, "only non-signer can be added");
        _setSigner(target, true);
        _signerCount += 1;
        emit SignerAddition(target);
    }

    function removeSigner(address target) external onlyOwner{
        require(_signerCount > 0, "signer num should be greater than 0, please add one or more signers first");
        require(_isSigner[target] == true, "only signer can be removed");
        _setSigner(target, false);
        _signerCount -= 1;
        emit SignerRemoval(target);
    }

    function changeThreshold(uint256 new_threshold) external onlyOwner{
        require(_signerCount <= new_threshold, "new threshold should be greater than current signer num");
        _threshold = new_threshold;
        emit ThresholdChanged(new_threshold);
    }

    function multisigTransfer(
        address to,
        uint256 value,
        address tokenContract,
        uint256 expireTime,
        bytes memory signatures
    ) public signerOnly {
        require(expireTime > block.timestamp, "transaction expired");
        require(tokenContract != address(0));
        require(signatures.length >= _threshold*65, "not enough signatures");
        address iOwner;
        uint8 v;
        bytes32 r;
        bytes32 s;
        // verification
        bytes32 dataHash = keccak256(abi.encode("ERC721", address(this), to, value, tokenContract, expireTime));

        uint256 validated_count = 0;
        uint256 total_count = 0;

        // initiate a new transaction record with state set to 0
        _transactions[_txCount] = Transaction({
            state: 0,
            txid: _txCount,
            value: value,
            requester: msg.sender,
            to: to,
            tokenContract: tokenContract
        });

        // parse signatures to confirmations
        while(validated_count<_threshold && total_count*65<signatures.length){
            (v,r,s) = _getvrs(signatures, total_count);
            if (v == 0) {
                // leave this case as "invalid signature"
                emit DevIgnoredV(total_count);
                total_count += 1;
                continue;
            } else if (v == 1) {
                // leave this case as "invalid signature"
                emit DevIgnoredV(total_count);
                total_count += 1;
                continue;
            } else if (v > 30) {
                iOwner = ecrecover(keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", dataHash)), v - 4, r, s);
            } else {
                iOwner = ecrecover(dataHash, v, r, s);
            }
            // check the signer has been registered and has not confirmed the transaction (to prevent multi-signature by a same signer)
            if (_isSigner[iOwner] && !_confirmations[_txCount][iOwner]){
                _confirmations[_txCount][iOwner] = true;
                validated_count += 1;
                total_count += 1;
            } else {
                revert("Revert : an invalid user or multi-sign by same user detected");
            }
        }

        // not enough validated signatures
        // in this case, set the state to 1
        if (validated_count < _threshold) {
            _transactions[_txCount].state = 1;
        } else {
            _transactions[_txCount].state = 2;
            // call token transfer
            IERC721(tokenContract).safeTransferFrom(address(this), to, value);
            _transactions[_txCount].state = 3;
        }

        // finally, add _txCount
        _txCount += 1;
    }

    ////////////////////////
    //   internal utils   //
    ////////////////////////

    /**
     * set the signer
     * @param target target user
     * @param canSign if target user can sign
     */
    function _setSigner(address target, bool canSign) internal onlyOwner {
        _isSigner[target] = canSign;
    }

    /**
     * locate the n-th signature from the signature bundle and split the v, r, s value
     * @param signatures bundle of signatures
     * @param n the index of target signature
     * @return v 
     * @return r 
     * @return s 
     */
    function _getvrs(bytes memory signatures, uint256 n) internal pure returns(uint8 v, bytes32 r, bytes32 s){
        assembly {
            let pos := mul(0x41, n)
            r := mload(add(signatures, add(pos, 0x20)))
            s := mload(add(signatures, add(pos, 0x40)))
            v := and(mload(add(signatures, add(pos, 0x41))), 0xff)
        }
    }
    
}