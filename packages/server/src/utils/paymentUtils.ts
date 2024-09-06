import { PrismaClient, TransactionStatus } from '@prisma/client';
import { WebSocket } from 'ws';
import logger from '../logger';
import { updateChannelBalances } from './balanceUtils';
import { getSignerBalance, htlcContract } from './signerUtils';

const prisma = new PrismaClient();

export async function processCachedPayments(ws: WebSocket, lnd: any) {
	try {
		const cachedPayments = await prisma.transaction.findMany({
			where: {
				status: 'CACHED',
			},
		});

		if (cachedPayments.length === 0) {
			logger.info('No cached payments to process.');
			return;
		}
		logger.info(`Processing ${cachedPayments.length} cached payments...`);

		// Get signer's balance
		const signerBalanceInfo = await getSignerBalance();
		if (!signerBalanceInfo) {
			logger.error('Failed to fetch signer balance. Aborting cached payments processing.');
			return;
		}

		logger.info(`Signer's balance: ${signerBalanceInfo.signerBalanceInEther} ETH`);

		for (const payment of cachedPayments) {
			try {
				logger.info(`Attempting to withdraw for contractId: ${payment.contractId}`);
				await htlcContract
					.withdraw(payment.contractId, '0x' + payment.secret)
					.then(async (tx) => {
						logger.info('Withdrawal Transaction Success:', tx);

						await prisma.transaction.update({
							where: { contractId: payment.contractId },
							data: {
								status: TransactionStatus.COMPLETED,
								date: new Date().toISOString(),
							},
						});

						// Update the channel balances after processing the invoice
						await updateChannelBalances(lnd);
						logger.info(`Successfully processed cached payment for contractId: ${payment.contractId}`);
						ws.send(JSON.stringify({ status: 'success', message: 'Invoice withdrawn successfully.' }));
					})
					.catch((error) => {
						logger.error(`Error with withdrawal for contractId ${payment.contractId}:`, error);
					});
			} catch (error) {
				logger.error(`Error processing cached payment for contractId ${payment.contractId}:`, error);
			}
		}
	} catch (error) {
		logger.error('Error fetching cached payments:', error);
	}
}
