import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { Address } from "ethereumjs-util";
import { Contract } from "ethers";
// import hre from "hardhat"
import { ethers } from "hardhat";

const {signers_addr, signers_privkey} = require('../secrets/accounts')

// ethereumJS support
const abi = require('ethereumjs-abi');
const util = require('ethereumjs-util');
const BN = require('bn.js');

// utils
const getOperationHash = function(prefix: string, multisig721Contract: string, to: string, value: any, tokenContract: string, expireTime: any){
    const buf: Buffer = abi.soliditySHA3(
        ['string', 'address', 'address', 'uint256', 'address', 'uint256'], 
        [prefix, new BN(multisig721Contract.replace('0x', ''), 16), new BN(to.replace('0x', ''), 16), value, new BN(tokenContract.replace('0x', ''), 16), expireTime]
    );
    return buf;
};

const getOperationHashSimple = function(to: string){
    const buf: Buffer = abi.soliditySHA3(
        ['address'], 
        [new BN(to.replace('0x', ''), 16)]
    );
    return buf;
};



describe("Multisig721", function(){
    // basic functional tests

    const threshold = 1;
    const maxSigner = 10;
    let signer_addresses: string[] = [];
    let signers: SignerWithAddress[];
    let multisig721: Contract;
    let nfta: Contract;

    before(async()=>{
        // add some test signers
        signers = await ethers.getSigners();
        signer_addresses.push(signers[0].address);
        signer_addresses.push(signers[1].address);
        signer_addresses.push(signers[2].address);

        // deploy contract instances
        multisig721 = await ethers.deployContract("Multisig721", [threshold, maxSigner]);
        nfta = await ethers.deployContract("NFTA");
    });
    
    // testing signer and threshold management

    it("should deploy with the right signers and threshold", async()=>{
        expect(await multisig721.devGetThreshold()).to.equal(threshold);
    });

    it("should be able to add some signers within maximum limits", async()=>{
        expect(await multisig721.devGetSignerCount()).to.equal(0);
        await multisig721.addSigner(signer_addresses[0]);
        await multisig721.addSigner(signer_addresses[1]);
        await multisig721.addSigner(signer_addresses[2]);
        expect(await multisig721.devGetSignerCount()).to.equal(3);
        console.log("current signers:", await multisig721.devGetSigners());
    });

    it("should be able to remove some signers if having any", async()=>{
        await multisig721.removeSigner(signer_addresses[0]);
        expect(await multisig721.devGetSignerCount()).to.equal(2);
        console.log("current signers:", await multisig721.devGetSigners());
    });

    it("should be able to change the threshold", async()=>{
        await multisig721.changeThreshold(2);
        expect(await multisig721.devGetThreshold()).to.equal(2);
    });

    it("testing privkey -> pubkey -> addr", async()=>{
        const privkey = Buffer.from(signers_privkey[0].replace(/^0x/i, ''), 'hex');
        const pubkey = util.privateToPublic(privkey);
        const addr = util.pubToAddress(pubkey).toString('hex');
        expect(signer_addresses[0].endsWith(addr))
        console.log("address:", addr);
    });

    //testing signing mechanism

    it("it should be able to recover the signed address", async()=>{
        const operationHash = getOperationHash("ERC721", multisig721.address.toLowerCase(), signer_addresses[1].toLowerCase(), 1, nfta.address.toLowerCase(), 1000);
        const sig = util.ecsign(operationHash, Buffer.from(signers_privkey[0].replace('0x', ''), 'hex'));
        const sig_serialized: string = '0x' + Buffer.concat([sig['r'], sig['s'], Buffer.from([sig['v']])]).toString('hex');
        console.log("operation hash in test: ", operationHash.toString('hex'));
        console.log("signature: ", sig_serialized);
        const addr_recovered: string = await multisig721.devRecoverSingleSigner(signer_addresses[1].toLowerCase(), 1, nfta.address.toLowerCase(), 1000, sig_serialized);
        expect(addr_recovered.toLowerCase() == signers_addr[0].toLowerCase());
    });
});