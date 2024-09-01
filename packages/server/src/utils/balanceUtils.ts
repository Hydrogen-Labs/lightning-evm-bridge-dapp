import { PrismaClient } from '@prisma/client';
import { getChannels } from 'lightning';
import logger from '../logger';

const prisma = new PrismaClient();
const RETRY_INTERVAL = 30000; // 30 seconds
const TIMEOUT = 1200000; // 20 minutes

export async function checkChannelBalances(
	lnd: any
): Promise<{ totalLocalBalance: number; totalRemoteBalance: number; totalUnsettledBalance: number; newCombinedBalance: number }> {
	const channels = await getChannels({ lnd });
	let totalLocalBalance = 0;
	let totalRemoteBalance = 0;
	let totalUnsettledBalance = 0;

	channels.channels.forEach((channel) => {
		totalLocalBalance += channel.local_balance;
		totalRemoteBalance += channel.remote_balance;
		totalUnsettledBalance += channel.unsettled_balance || 0;
	});

	const newCombinedBalance = totalLocalBalance + totalRemoteBalance + totalUnsettledBalance;

	logger.info(`Channel Balances: Local - ${totalLocalBalance}`);
	logger.info(`Channel Balances: Remote - ${totalRemoteBalance}`);
	logger.info(`Channel Balances: Unsettled - ${totalUnsettledBalance}`);
	logger.info(`Channel Balances: Combined - ${newCombinedBalance}`);

	return { totalLocalBalance, totalRemoteBalance, totalUnsettledBalance, newCombinedBalance };
}

export async function updateChannelBalances(lnd: any) {
	try {
		let attempts = 0;
		const startTime = Date.now();

		while (Date.now() - startTime < TIMEOUT) {
			const { totalLocalBalance, totalRemoteBalance, totalUnsettledBalance, newCombinedBalance } = await checkChannelBalances(lnd);

			// Fetch the latest two balance records from the database
			const balanceRecords = await prisma.channelBalance.findMany({
				orderBy: { date: 'desc' },
				take: 2,
			});

			if (balanceRecords.length > 0) {
				const lastBalanceRecord = balanceRecords[0];
				const lastCombinedBalance = lastBalanceRecord.combinedBalance;

				if (newCombinedBalance < lastCombinedBalance) {
					if (totalUnsettledBalance > 0) {
						logger.warn(`Unsettled balance detected. Waiting to see if it resolves... Attempt ${attempts + 1}`);
						await new Promise((resolve) => setTimeout(resolve, RETRY_INTERVAL));
						attempts += 1;
						continue; // Retry if unsettled balance is detected
					} else {
						logger.error('Error: New combined balance is less than the previous combined balance. Potential fund loss.');
						process.exit(1); // Stop the server
					}
				}
			}

			// Proceed to update the database with the new balances
			await prisma.channelBalance.create({
				data: {
					totalLocalBalance,
					totalRemoteBalance,
					combinedBalance: newCombinedBalance,
					totalUnsettledBalance,
				},
			});

			// Ensure only the latest two balance entries are kept in the database
			if (balanceRecords.length > 1) {
				const oldestBalanceRecordId = balanceRecords[1].id;
				await prisma.channelBalance.delete({
					where: { id: oldestBalanceRecordId },
				});
			}

			logger.info(
				`Updated Channel Balances: Local - ${totalLocalBalance}, Remote - ${totalRemoteBalance}, Combined - ${newCombinedBalance}, Unsettled - ${totalUnsettledBalance}`
			);
			return; // Exit the loop and function once balances are updated successfully
		}

		logger.error('Timeout reached with unsettled balance still present. Exiting to prevent potential issues.');
		process.exit(1); // Exit the server after timeout if unsettled balance persists
	} catch (error) {
		logger.error('Error updating channel balances:', error);
		process.exit(1); // Stop the server if an error occurs
	}
}
