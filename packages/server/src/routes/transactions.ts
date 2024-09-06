import express from 'express';
import logger from '../logger';
import prisma from '../prismaClient';
import { getContractInstance } from '../utils/contract';
import { checkRefundedFlag } from '../utils/validation';

const router = express.Router();

router.post('/refund', async (req, res) => {
	const { contractId, txHash } = req.body;

	try {
		// Find the transaction
		const transaction = await prisma.transaction.findUnique({ where: { contractId: contractId } });

		if (!transaction) {
			return res.status(404).json({ error: 'Transaction not found' });
		}

		// Get the contract instance
		const htlcContract = getContractInstance();

		// Verify the refund flag in the contract
		const isRefunded = await checkRefundedFlag(transaction.contractId, htlcContract);
		if (!isRefunded) {
			return res.status(400).json({ error: 'Refund has not been processed according to the contract' });
		}

		// Update transaction status in the database
		const updatedTransaction = await prisma.transaction.update({
			where: { contractId: contractId },
			data: { status: 'REFUNDED', date: new Date().toISOString(), txHash: txHash },
		});

		res.status(200).json(updatedTransaction);
	} catch (error) {
		logger.error('Error verifying refund:', error);
		res.status(500).json({ error: 'Internal Server Error' });
	}
});

// Add the new route for fetching transactions
router.get('/', async (req, res) => {
	const { userAddress } = req.query;

	if (!userAddress) {
		return res.status(400).json({ error: 'User address is required' });
	}

	try {
		const transactions = await prisma.transaction.findMany({
			where: { userAddress: userAddress as string },
			orderBy: {
				date: 'desc', // Order transactions by date in descending order
			},
			take: 10, // Limit the number of transactions to 10
		});
		res.status(200).json(transactions);
	} catch (error) {
		logger.error('Failed to fetch transactions:', error);
		res.status(500).json({ error: 'Failed to fetch transactions' });
	}
});

export default router;
