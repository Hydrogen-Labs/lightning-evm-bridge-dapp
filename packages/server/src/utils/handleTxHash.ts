import { TxHashMessage } from '@lightning-evm-bridge/shared';
import { TransactionStatus } from '@prisma/client';
import prisma from '../prismaClient';
import { ServerState } from '../types/types';
import { updateChannelBalances } from './balanceUtils';

export async function handleTxHash(request: TxHashMessage, serverState: ServerState) {
	console.log('Handling TX_HASH kind', request);
	try {
		// Ensure contractId is provided
		if (!request.contractId) {
			throw new Error('Contract ID missing for TX_HASH message');
		}
		if (!request.txHash) {
			throw new Error('txHash missing for TX_HASH message');
		}

		// Update the record in the database where contractId matches
		const updatedRecord = await prisma.transaction.update({
			where: { contractId: request.contractId },
			data: {
				status: TransactionStatus.COMPLETED,
				txHash: request.txHash,
			},
		});

		console.log('Updated record with txHash:', updatedRecord);
		// Update the channel balances after processing the invoice
		await updateChannelBalances(serverState.lnd);
	} catch (error) {
		console.error('Error updating transaction with txHash:', error);
	}
}
