import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { Contract } from "ethers";
// import hre from "hardhat"
import { ethers } from "hardhat";

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
        // nfta = await ethers.deployContract("NFTA");
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
});