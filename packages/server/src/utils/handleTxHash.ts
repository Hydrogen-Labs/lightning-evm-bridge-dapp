import { TxHashMessage } from '@lightning-evm-bridge/shared';
import { TransactionStatus } from '@prisma/client';
import * as WebSocket from 'ws';
import logger from '../logger';
import prisma from '../prismaClient';
import { ServerState } from '../types/types';
import { updateChannelBalances } from './balanceUtils';

export async function handleTxHash(request: TxHashMessage, ws: WebSocket, serverState: ServerState) {
	try {
		// Ensure contractId and txHash are provided
		if (!request.contractId || !request.txHash) {
			throw new Error('contractId or txHash missing in the TX_HASH message');
		}

		logger.info('Handling TX_HASH with data', request);

		// Add a delay to ensure the record exists
		await new Promise((resolve) => setTimeout(resolve, 5000)); // Delay for 500ms

		// Attempt to update the record in the database where contractId matches
		const updatedRecord = await prisma.transaction.update({
			where: { contractId: request.contractId },
			data: {
				status: TransactionStatus.COMPLETED,
				date: new Date().toISOString(),
				txHash: request.txHash,
			},
		});

		logger.info('Updated transaction record:', updatedRecord);

		// // Send a success message to the client
		// ws.send(JSON.stringify({ status: 'success', message: 'Transaction hash updated successfully.' }));

		// Update the channel balances after processing the invoice
		await updateChannelBalances(serverState.lnd);
	} catch (error) {
		// Log the specific error and rethrow if necessary
		logger.error('Error handling TX_HASH:', error);
	}
}
