console.clear();
require("dotenv").config();
const {
	AccountId,
	PrivateKey,
	Client,
	TokenCreateTransaction,
	TokenInfoQuery,
	TokenType,
	CustomRoyaltyFee,
	CustomFixedFee,
	Hbar,
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
} = require("@hashgraph/sdk");
//const fs = require("fs");

const CONFIG = require('./config.json');


//Grabing Owr credentials from the .env file
const operatorId = AccountId.fromString(process.env.OPERATOR_ID);
const operatorKey = PrivateKey.fromString(process.env.OPERATOR_PVKEY);
const treasuryId = AccountId.fromString(process.env.TREASURY_ID);
const treasuryKey = PrivateKey.fromString(process.env.TREASURY_PVKEY);

const CID = CONFIG.METADATA_DIRECTORY_CID;

const client = Client.forTestnet().setOperator(operatorId, operatorKey);
const supplyKey = PrivateKey.generate();
const adminKey = PrivateKey.generate();


async function main() {
	//token creation
	let nftCreate = await new TokenCreateTransaction()
		.setTokenName(CONFIG.NAME)
		.setTokenSymbol(CONFIG.SYMBOL)
		.setTokenType(TokenType.NonFungibleUnique)
		.setDecimals(0)
		.setInitialSupply(0)
		.setTreasuryAccountId(treasuryId)
		.setSupplyType(TokenSupplyType.Finite)
		.setMaxSupply(CONFIG.MAXSUPPLY)
		.setAdminKey(adminKey)
		.setSupplyKey(supplyKey)
		.freezeWith(client)
		.sign(treasuryKey);

	let nftCreateTxSign = await nftCreate.sign(adminKey);
	let nftCreateSubmit = await nftCreateTxSign.execute(client);
	let nftCreateRx = await nftCreateSubmit.getReceipt(client);
	let tokenId = nftCreateRx.tokenId;
	// process.env.TOKEN_ID = tokenId;
	// process.env.TOKEN_SUPPLYKEY = supplyKey;
	// process.env.TOKEN_ADMINKEY = adminKey;

	


    for (let i=1; i <= CONFIG.INITIALSUPPLY ; i++) {
        cid = CONFIG.METADATA_DIRECTORY_CID + "/" + i + ".json";
        console.log(`Minting NFT #${i}`);
        await tokenMinterFcn(cid);
    }
    console.log(`NFT Collection Minted`);
    console.log(`The Collection token ID is : ${tokenId}`);
	console.log(`The Collection Supply KEY ID is : ${supplyKey}`);
	console.log(`The Collection Admin KEY ID is : ${adminKey}`);


	// FUNCTIONS
	async function tQueryFcn(tid) {
		var tokenInfo = await new TokenInfoQuery().setTokenId(tid).execute(client);
		return tokenInfo;
	}
	async function bCheckerFcn(aId) {
		let balanceCheckTx = await new AccountBalanceQuery().setAccountId(aId).execute(client);
		return balanceCheckTx.tokens._map.get(tokenId.toString());
	}

	// TOKEN MINTER FUNCTION ==========================================
	async function tokenMinterFcn(CID) {
        mintTx = await new TokenMintTransaction()
			.setTokenId(tokenId)
			.setMetadata([new TextEncoder("utf-8").encode(CID)])
			.freezeWith(client);
		let mintTxSign = await mintTx.sign(supplyKey);
		let mintTxSubmit = await mintTxSign.execute(client);
		let mintRx = await mintTxSubmit.getReceipt(client);
		return mintRx;
	}

	// BALANCE CHECKER FUNCTION ==========================================
	async function bCheckerFcn(id) {
		balanceCheckTx = await new AccountBalanceQuery().setAccountId(id).execute(client);
		return [balanceCheckTx.tokens._map.get(tokenId.toString()), balanceCheckTx.hbars];
	}
}
main();
