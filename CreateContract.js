console.clear();
require("dotenv").config();
const {
	AccountId,
	PrivateKey,
	Client,
    TokenId,
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
// client.setMaxTransactionFee(new Hbar(0.75));
// client.setMaxQueryPayment(new Hbar(0.01));

const tokenId = TokenId.fromString(process.env.TOKEN_ID);
const tokenAddressSol = tokenId.toSolidityAddress();
console.log(`- Token ID: ${tokenId}`);
console.log(`- Token ID in Solidity format: ${tokenAddressSol}`);

async function main() {
	// STEP 1 ===================================
	console.log(`STEP 1 ============ get file ============`);
	const bytecode = fs.readFileSync("./gppgnftcontract_sol_gppgnftcontract.bin");
	console.log(`- Done \n`);

	// STEP 2 ===================================
	console.log(`STEP 2 ============= uploading the file to hedera ==============`);
	// Token query
	const tokenInfo1 = await tQueryFcn(tokenId);
	console.log(`- Initial token supply: ${tokenInfo1.totalSupply.low} \n`);

	//Create a file on Hedera and store the contract bytecode
	console.log(`Creating file`);
	const fileCreateTx = new FileCreateTransaction().setKeys([treasuryKey]).freezeWith(client);
	const fileCreateSign = await fileCreateTx.sign(treasuryKey);
	const fileCreateSubmit = await fileCreateSign.execute(client);
	const fileCreateRx = await fileCreateSubmit.getReceipt(client);
	const bytecodeFileId = fileCreateRx.fileId;
	console.log(`- The smart contract bytecode file ID is ${bytecodeFileId}`);

	// Append contents to the file
	console.log(`appending file`);
	const fileAppendTx = new FileAppendTransaction()
		.setFileId(bytecodeFileId)
		.setContents(bytecode)
		.setMaxChunks(15)
		.freezeWith(client);
	const fileAppendSign = await fileAppendTx.sign(treasuryKey);
	const fileAppendSubmit = await fileAppendSign.execute(client);
	const fileAppendRx = await fileAppendSubmit.getReceipt(client);
	console.log(`- Appending status: ${fileAppendRx.status} \n`);

	// STEP 3 ===================================
	console.log(`STEP 3 ============== Smart Contract Creation ============`);
	// Create the smart contract
	const contractInstantiateTx = new ContractCreateTransaction()
		.setBytecodeFileId(bytecodeFileId)
		.setGas(5000000)
		.setConstructorParameters(
			new ContractFunctionParameters()
			.addAddress(tokenAddressSol)
			.addAddress(escrowId.toSolidityAddress())
			.addInt64(CONFIG.MAXSUPPLY));
	const contractInstantiateSubmit = await contractInstantiateTx.execute(client);
	const contractInstantiateRx = await contractInstantiateSubmit.getReceipt(client);
	const contractId = contractInstantiateRx.contractId;
	const contractAddress = contractId.toSolidityAddress();
	console.log(`- The smart contract ID is: ${contractId}`);
	console.log(`- The smart contract ID in Solidity format is: ${contractAddress} \n`);

	// Token query 2.1
	const tokenInfo2p1 = await tQueryFcn(tokenId);
	console.log(`- Token supply key: ${tokenInfo2p1.supplyKey.toString()}`);
	console.log(`Contract UP on hedera`);
	console.log(`Associating Contract with the token`);
	// Update the fungible so the smart contract manages the supply
	const tokenUpdateTx0 = await new TokenUpdateTransaction()
		.setTokenId(tokenId)
		.setSupplyKey(contractId)
		.freezeWith(client)
		.sign(treasuryKey);
	const tokenUpdateTx = await tokenUpdateTx0.sign(adminKey);
	const tokenUpdateSubmit = await tokenUpdateTx.execute(client);
	const tokenUpdateRx = await tokenUpdateSubmit.getReceipt(client);
	console.log(`- Token update status: ${tokenUpdateRx.status}`);

	// Token query 2.2
	const tokenInfo2p2 = await tQueryFcn(tokenId);
	console.log(`- Token supply key: ${tokenInfo2p2.supplyKey.toString()} \n`);

    	// ========================================
	// FUNCTIONS
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