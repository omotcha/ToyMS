import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
// import { Address } from "ethereumjs-util";
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

describe("Multisig721", function(){
    // basic functional tests

    const threshold = 1;
    const maxSigner = 10;
    let signer_addresses: string[] = [];
    let signers: SignerWithAddress[];
    let multisig721: Contract;
    let nfta: Contract;

    before(async () => {
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

    it("should deploy with the right signers and threshold", async () => {
        expect(await multisig721.devGetThreshold()).to.equal(threshold);
    });

    it("it should be able to add some signers within maximum limits", async () => {
        expect(await multisig721.devGetSignerCount()).to.equal(0);
        await multisig721.addSigner(signer_addresses[0]);
        await multisig721.addSigner(signer_addresses[1]);
        await multisig721.addSigner(signer_addresses[2]);
        expect(await multisig721.devGetSignerCount()).to.equal(3);
        console.log("current signers:", await multisig721.devGetSigners());
    });

    it("should be able to remove some signers if having any", async () => {
        await multisig721.removeSigner(signer_addresses[0]);
        expect(await multisig721.devGetSignerCount()).to.equal(2);
        console.log("current signers:", await multisig721.devGetSigners());
    });

    it("it should be able to change the threshold", async () => {
        await multisig721.changeThreshold(2);
        expect(await multisig721.devGetThreshold()).to.equal(2);
    });

    it("testing privkey -> pubkey -> addr", async () => {
        const privkey = Buffer.from(signers_privkey[0].replace(/^0x/i, ''), 'hex');
        const pubkey = util.privateToPublic(privkey);
        const addr = util.pubToAddress(pubkey).toString('hex');
        expect(signer_addresses[0].endsWith(addr))
        console.log("address:", addr);
    });

    // testing signing mechanism

    it("it should be able to recover the signed addresses", async () => {
        const pos = 1;
        const operationHash = getOperationHash("ERC721", multisig721.address.toLowerCase(), signer_addresses[1].toLowerCase(), 1, nfta.address.toLowerCase(), 1000);
        const sig_1 = util.ecsign(operationHash, Buffer.from(signers_privkey[0].replace('0x', ''), 'hex'));
        const sig_2 = util.ecsign(operationHash, Buffer.from(signers_privkey[1].replace('0x', ''), 'hex'));
        const sig_serialized: string = '0x' + Buffer.concat([sig_1['r'], sig_1['s'], Buffer.from([sig_1['v']]), sig_2['r'], sig_2['s'], Buffer.from([sig_2['v']])]).toString('hex');
        const addr_recovered: string = await multisig721.devRecoverSingleSigner(signer_addresses[1].toLowerCase(), 1, nfta.address.toLowerCase(), 1000, sig_serialized, pos);
        expect(addr_recovered.toLowerCase() == signers_addr[pos].toLowerCase());
    });

    // testing NFT minting, approving, and multisig transferring

    it("it should be able to mint an NFTA token and support approvements and transfer to another user", async () => {
        await nfta.safeMint(signer_addresses[1], 1);
        expect(await nfta.ownerOf(1)).to.equal(signer_addresses[1]);
        console.log(signer_addresses[1]);
        await nfta.connect(signers[1]).approve(multisig721.address, 1);
        expect(await nfta.getApproved(1)).to.equal(multisig721.address);
        await nfta.connect(signers[1]).transferFrom(signer_addresses[1], multisig721.address, 1);
    });

    it("it should be able to transfer an NFTA token with enough valid signatures",async () => {
        const expireTime = new Date().getTime() + 30 * 60 * 1000;
        const operationHash = getOperationHash("ERC721", multisig721.address.toLowerCase(), signer_addresses[2].toLowerCase(), 1, nfta.address.toLowerCase(), expireTime);
        const sig_1 = util.ecsign(operationHash, Buffer.from(signers_privkey[1].replace('0x', ''), 'hex'));
        const sig_2 = util.ecsign(operationHash, Buffer.from(signers_privkey[2].replace('0x', ''), 'hex'));
        const sig_3 = util.ecsign(operationHash, Buffer.from(signers_privkey[3].replace('0x', ''), 'hex'));
        const sig_serialized: string = '0x' + Buffer.concat([sig_1['r'], sig_1['s'], Buffer.from([sig_1['v']]), sig_2['r'], sig_2['s'], Buffer.from([sig_2['v']])]).toString('hex');
        // const sig_serialized: string = '0x' + Buffer.concat([sig_1['r'], sig_1['s'], Buffer.from([sig_1['v']]), sig_3['r'], sig_3['s'], Buffer.from([sig_3['v']])]).toString('hex');
        const result = await multisig721.multisigTransfer(signer_addresses[2].toLowerCase(), 1, nfta.address.toLowerCase(), expireTime, sig_serialized);
        expect(await multisig721.devCheckTxState(0)).to.equal(3);
        expect(await nfta.ownerOf(1)).to.equal(signer_addresses[2]);
    });
});