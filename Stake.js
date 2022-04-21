console.clear();
require("dotenv").config();
const {
	AccountId,
	TokenId,
	ContractId,
	PrivateKey,
	Client,
	TokenCreateTransaction,
	TokenInfoQuery,
	TokenType,
	CustomRoyaltyFee,
	CustomFixedFee,
	TokenSupplyType,
	TokenMintTransaction,
	TokenBurnTransaction,
	TransferTransaction,
	AccountBalanceQuery,
	AccountUpdateTransaction,
	TokenAssociateTransaction,
	TokenUpdateTransaction,
	TokenGrantKycTransaction,
	TokenRevokeKycTransaction,
	ScheduleCreateTransaction,
	ScheduleSignTransaction,
	ScheduleInfoQuery,
	TokenPauseTransaction,
	TokenUnpauseTransaction,
	TokenWipeTransaction,
	TokenFreezeTransaction,
	TokenUnfreezeTransaction,
	TokenDeleteTransaction,
	FileCreateTransaction,
	FileAppendTransaction,
	ContractCreateTransaction,
	ContractFunctionParameters,
	ContractExecuteTransaction,
	ContractCallQuery,
	Hbar,
} = require("@hashgraph/sdk");
const fs = require("fs");

const CONFIG = require('./config.json');

const operatorId = AccountId.fromString(process.env.OPERATOR_ID);
const operatorKey = PrivateKey.fromString(process.env.OPERATOR_PVKEY);
const treasuryId = AccountId.fromString(process.env.TREASURY_ID);
const treasuryKey = PrivateKey.fromString(process.env.TREASURY_PVKEY);
const aliceId = AccountId.fromString(process.env.ALICE_ID);
const aliceyKey = PrivateKey.fromString(process.env.ALICE_PVKEY);

const escrowId = AccountId.fromString(process.env.ESCROW_ID);
const escrowKey = PrivateKey.fromString(process.env.ESCROW_PVKEY);

const client = Client.forTestnet().setOperator(operatorId, operatorKey);
const supplyKey = PrivateKey.fromString(process.env.TOKEN_SYPPLYKEY);
const adminKey = PrivateKey.fromString(process.env.TOKEN_ADMINKEY);

const tokenId = TokenId.fromString(process.env.TOKEN_ID);
const tokenAddressSol = tokenId.toSolidityAddress(); 
const contractId = ContractId.fromString(process.env.CONTRACT_ID);
console.log(`- Token ID: ${tokenId}`);
console.log(`- Contract ID: ${contractId}`);
console.log(`- Token ID in Solidity format: ${tokenAddressSol}`);


async function main() {
    let id = aliceId;
    let prv = aliceyKey;
	console.log(`==========TEST 1: Staking===============`);
    await stake(id,[1],prv);
	
	let tB = await bCheckerFcn(escrowId);
	let aB = await bCheckerFcn(aliceId);
	console.log(`- Treasury balance: ${tB} units of token ${tokenId}`);
	console.log(`- Alice balance: ${aB} units of token ${tokenId} \n`);
	
	aB = await getStaked(aliceId);
	
	console.log(`- Alice staked: the serials ${aB} of token ${tokenId} \n`);
	console.log(`==========TEST 2: unStaking===============`);
	await unstake(id,[1],prv);
	tB = await bCheckerFcn(escrowId);
	aB = await bCheckerFcn(aliceId);
	console.log(`- Treasury balance: ${tB} units of token ${tokenId}`);
	console.log(`- Alice balance: ${aB} units of token ${tokenId} \n`);
	
	aB = await getStaked(aliceId);
	
	console.log(`- Alice staked: the serials ${aB} of token ${tokenId} \n`);
	
	aB = await getUnStaked(aliceId);
	
	console.log(`- Alice unstaked: the serials ${aB} of token ${tokenId} \n`);
	console.log(`${escrowId.toSolidityAddress()}`);
// ========================================
	// FUNCTIONS
    async function stake(id,nfts,prv) {
        //calling staking function on hedera

        const contractExecTx2 = await new ContractExecuteTransaction()
            .setContractId(contractId)
            .setGas(4000000)
            .setFunction("stake", new ContractFunctionParameters().addAddress(id.toSolidityAddress()).addInt64Array(nfts))
            .freezeWith(client);
        const contractExecSign2 = await contractExecTx2.sign(prv);
        const contractExecSubmit2 = await contractExecSign2.execute(client);
        const contractExecRx2 = await contractExecSubmit2.getReceipt(client);
	}

	async function unstake(id,nfts,prv) {
        //calling staking function on hedera

        const contractExecTx2 = await new ContractExecuteTransaction()
            .setContractId(contractId)
            .setGas(5000000)
            .setFunction("unstake", new ContractFunctionParameters().addAddress(id.toSolidityAddress()).addInt64Array(nfts))
            .freezeWith(client);
        const contractExecSign2 = await contractExecTx2.sign(prv);
		const contractExecSign3 = await contractExecSign2.sign(escrowKey);
        const contractExecSubmit2 = await contractExecSign3.execute(client);
        const contractExecRx2 = await contractExecSubmit2.getReceipt(client);

        console.log(`- staking: ${contractExecRx2.status.toString()}`);

    }
	async function getStaked(id,i) {
		const donuc = await new ContractCallQuery()
			.setContractId(contractId)
			.setFunction("getstaked", new ContractFunctionParameters().addAddress(id.toSolidityAddress()))
			.setGas(5000000)
			.setQueryPayment(new Hbar(0.1))
			.execute(client);
		const result = donuc.getInt64(0);
		return result;
	}
	async function getUnStaked(id,i) {
		const donuc = await new ContractCallQuery()
			.setContractId(contractId)
			.setFunction("getunstaked", new ContractFunctionParameters().addAddress(id.toSolidityAddress()))
			.setGas(5000000)
			.setQueryPayment(new Hbar(0.1))
			.execute(client);
		const result = donuc.asBytes(0);
		return result;
	}

	async function tQueryFcn(tId) {
		let info = await new TokenInfoQuery().setTokenId(tId).execute(client);
		return info;
	}

	async function bCheckerFcn(aId) {
		let balanceCheckTx = await new AccountBalanceQuery().setAccountId(aId).execute(client);
		return balanceCheckTx.tokens._map.get(tokenId.toString());
	}
}
main();