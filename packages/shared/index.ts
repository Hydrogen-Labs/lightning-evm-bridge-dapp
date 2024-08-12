import deployedContracts from './contracts/deployedContracts';
import externalContracts from './contracts/externalContracts';

export { deployedContracts, externalContracts };

export type ProviderConfig = {
	minSats: number;
	maxSats: number;
	sendBaseFee: number;
	sendBasisPointFee: number; // 100 = 1%
	secondsTillInvoiceExpires: number;
	maxLNFee: number;
	recieveBaseFee: number;
	recieveBasisPointFee: number;
};

export type ClientRequest = InvoiceRequest | InitiationRequest | RelayRequest | RelayResponse | TxHashMessage;

export interface RelayRequest {
	kind: KIND.RELAY_REQUEST;
	contractId: string;
	preimage: string;
}

export interface RelayResponse {
	kind: KIND.RELAY_RESPONSE;
	status: 'success' | 'error';
	txHash: string;
	contractId: string;
}

export interface InvoiceRequest {
	kind: KIND.INVOICE_SEND;
	contractId: string;
	lnInvoice: string;
	txHash: string;
}

export interface InitiationRequest {
	kind: KIND.INITIATION_RECIEVE;
	amount: number;
	recipient: string;
	hashlock: string;
}

export interface InitiationResponse {
	lnInvoice: string;
}

export interface HodlInvoiceResponse {
	kind: KIND.HODL_RES;
	lnInvoice: string;
}

export interface HodlInvoiceContractResponse {
	kind: KIND.HODL_CONTRACT_RES;
	contractId: string;
}

export interface TxHashMessage {
	kind: KIND.TX_HASH;
	txHash: string;
	contractId: string;
}

export enum KIND {
	RELAY_REQUEST = 'relay_request',
	RELAY_RESPONSE = 'relay_response',
	INVOICE_SEND = 'invoice_send',
	INITIATION_RECIEVE = 'initiation_recieve',
	HODL_RES = 'hodl_res',
	HODL_CONTRACT_RES = 'hodl_contract_res',
	TX_HASH = 'tx_hash',
}

export interface InvoiceResponse {
	status: 'success' | 'error' | 'pending';
	message: string;
}

export enum ServerStatus {
	ACTIVE = 'ACTIVE',
	INACTIVE = 'INACTIVE',
	MOCK = 'MOCK',
}

export interface ConnectionResponse {
	serverStatus: ServerStatus;
	serverConfig: ProviderConfig;
	uuid: string;
	message: string;
	signerActive: boolean;
}

export type ServerResponse = InvoiceResponse | ConnectionResponse | HodlInvoiceResponse | HodlInvoiceContractResponse;

export const GWEIPERSAT = 1e10;

export function parseContractDetails(response: any): ContractDetails {
	return {
		sender: response[0],
		receiver: response[1],
		amount: BigInt(Number(response[2]) / GWEIPERSAT),
		hashlock: response[3],
		timelock: response[4],
		withdrawn: response[5],
		refunded: response[6],
		preimage: response[7],
	};
}

export type ContractDetails = {
	sender: string;
	receiver: string;
	amount: BigInt;
	hashlock: string;
	timelock: BigInt;
	withdrawn: boolean;
	refunded: boolean;
	preimage: string;
};

export type Transaction = {
	status: 'PENDING' | 'FAILED' | 'COMPLETED' | 'REFUNDED' | 'RELAYED' | 'CACHED';
	date: string;
	amount: number;
	txHash: string;
	contractId: string;
	hashLockTimestamp: number;
	lnInvoice: string;
	userAddress: string;
	transactionType: 'RECEIVED' | 'SENT';
};
