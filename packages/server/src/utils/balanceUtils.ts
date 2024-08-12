// balanceUtils.ts
import { PrismaClient } from '@prisma/client';
import { getChannels } from 'lightning';
import logger from '../logger';

const prisma = new PrismaClient();

export async function updateChannelBalances(lnd: any) {
	try {
		const channels = await getChannels({ lnd });
		let totalLocalBalance = 0;
		let totalRemoteBalance = 0;
		let totalUnsettledBalance = 0;

		channels.channels.forEach((channel) => {
			totalLocalBalance += channel.local_balance;
			totalRemoteBalance += channel.remote_balance;
			totalUnsettledBalance += channel.unsettled_balance || 0;
		});

		const newCombinedBalance = totalLocalBalance + totalRemoteBalance;

		// Fetch the latest two balance records from the database
		const balanceRecords = await prisma.channelBalance.findMany({
			orderBy: { date: 'desc' },
			take: 2,
		});

		if (balanceRecords.length > 0) {
			const lastBalanceRecord = balanceRecords[0];
			const lastCombinedBalance = lastBalanceRecord.combinedBalance;

			if (newCombinedBalance < lastCombinedBalance) {
				logger.error('Error: New combined balance is less than the previous combined balance. Potential fund loss.');
				// Handle the error as needed, for example:
				// throw new Error('Potential fund loss detected.');
				process.exit(1); // Stop the server
			}
		}

		// Proceed to update the database with the new balances
		await prisma.channelBalance.create({
			data: {
				totalLocalBalance,
				totalRemoteBalance,
				combinedBalance: newCombinedBalance,
			},
		});

		// Ensure only the latest two balance entries are kept in the database
		if (balanceRecords.length > 1) {
			const oldestBalanceRecordId = balanceRecords[1].id;
			await prisma.channelBalance.delete({
				where: { id: oldestBalanceRecordId },
			});
		}

		logger.info(`Updated Channel Balances: Local - ${totalLocalBalance}, Remote - ${totalRemoteBalance}, Combined - ${newCombinedBalance}`);
	} catch (error) {
		logger.error('Error updating channel balances:', error);
	}
}
