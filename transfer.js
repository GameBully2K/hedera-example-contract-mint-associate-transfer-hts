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

const client = Client.forTestnet().setOperator(operatorId, operatorKey);
const supplyKey = PrivateKey.fromString(process.env.TOKEN_SYPPLYKEY);
const adminKey = PrivateKey.fromString(process.env.TOKEN_ADMINKEY);
client.setMaxTransactionFee(new Hbar(0.75));
client.setMaxQueryPayment(new Hbar(0.01));

const tokenId = TokenId.fromString(process.env.TOKEN_ID);
const tokenAddressSol = tokenId.toSolidityAddress(); 
const contractId = ContractId.fromString(process.env.CONTRACT_ID);
console.log(`- Token ID: ${tokenId}`);
console.log(`- Contract ID: ${contractId}`);
console.log(`- Token ID in Solidity format: ${tokenAddressSol}`);


async function dev() {
	const CheckContractOwner = await new ContractCallQuery()
		.setContractId(contractId)
		.setFunction("getClient")
		.setGas(75000)
		.execute(client);
	const owner = CheckContractOwner.getAddress(0);
	console.log(`${owner}`);

	//Execute a contract function (transfer)
	const contractExecTx2 = await new ContractExecuteTransaction()
        .setContractId(contractId)
        .setGas(3000000)
        .setFunction(
            "NFTTransfer",
            new ContractFunctionParameters()
                .addAddress(treasuryId.toSolidityAddress())
                .addAddress(aliceId.toSolidityAddress())
                .addInt64Array([9]))
        .freezeWith(client);
    const contractExecSign2 = await contractExecTx2.sign(treasuryKey);
    const contractExecSubmit2 = await contractExecSign2.execute(client);
    const contractExecRx2 = await contractExecSubmit2.getReceipt(client);

    console.log(`- Token transfer from Treasury to Alice: ${contractExecRx2.status.toString()}`);

    const tB = await bCheckerFcn(treasuryId);
    const aB = await bCheckerFcn(aliceId);
    console.log(`- Treasury balance: ${tB} units of token ${tokenId}`);
    console.log(`- Alice balance: ${aB} units of token ${tokenId} \n`);

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

} dev();