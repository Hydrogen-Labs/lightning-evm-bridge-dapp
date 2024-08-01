import { ClientRequest, TxHashMessage } from '@lightning-evm-bridge/shared';
import prisma from '../prismaClient';

export async function handleTxHash(request: TxHashMessage) {
	console.log('Handling TX_HASH kind', request);
	try {
		// Ensure contractId is provided
		if (!request.contractId) {
			throw new Error('Contract ID missing for TX_HASH message');
		}

		// Update the record in the database where contractId matches
		const updatedRecord = await prisma.transaction.update({
			where: { contractId: request.contractId },
			data: { txHash: request.txHash },
		});

		console.log('Updated record with txHash:', updatedRecord);
	} catch (error) {
		console.error('Error updating transaction with txHash:', error);
	}
}
