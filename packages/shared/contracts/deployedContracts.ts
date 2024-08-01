/**
 * This file is autogenerated by Scaffold-ETH.
 * You should not edit it manually or your changes might be overwritten.
 */

const deployedContracts = {
	3636: {
		HashedTimelock: {
			address: '0x184375F7d9104fc34C523Ee16c1270A16Bb4BFC2',
			abi: [
				{
					anonymous: false,
					inputs: [
						{
							indexed: true,
							internalType: 'bytes32',
							name: 'contractId',
							type: 'bytes32',
						},
						{
							indexed: true,
							internalType: 'address',
							name: 'sender',
							type: 'address',
						},
						{
							indexed: true,
							internalType: 'address',
							name: 'receiver',
							type: 'address',
						},
						{
							indexed: false,
							internalType: 'uint256',
							name: 'amount',
							type: 'uint256',
						},
						{
							indexed: false,
							internalType: 'bytes32',
							name: 'hashlock',
							type: 'bytes32',
						},
						{
							indexed: false,
							internalType: 'uint256',
							name: 'timelock',
							type: 'uint256',
						},
					],
					name: 'LogHTLCNew',
					type: 'event',
				},
				{
					anonymous: false,
					inputs: [
						{
							indexed: true,
							internalType: 'bytes32',
							name: 'contractId',
							type: 'bytes32',
						},
					],
					name: 'LogHTLCRefund',
					type: 'event',
				},
				{
					anonymous: false,
					inputs: [
						{
							indexed: true,
							internalType: 'bytes32',
							name: 'contractId',
							type: 'bytes32',
						},
					],
					name: 'LogHTLCWithdraw',
					type: 'event',
				},
				{
					inputs: [
						{
							internalType: 'bytes32',
							name: '_contractId',
							type: 'bytes32',
						},
					],
					name: 'getContract',
					outputs: [
						{
							internalType: 'address',
							name: 'sender',
							type: 'address',
						},
						{
							internalType: 'address',
							name: 'receiver',
							type: 'address',
						},
						{
							internalType: 'uint256',
							name: 'amount',
							type: 'uint256',
						},
						{
							internalType: 'bytes32',
							name: 'hashlock',
							type: 'bytes32',
						},
						{
							internalType: 'uint256',
							name: 'timelock',
							type: 'uint256',
						},
						{
							internalType: 'bool',
							name: 'withdrawn',
							type: 'bool',
						},
						{
							internalType: 'bool',
							name: 'refunded',
							type: 'bool',
						},
						{
							internalType: 'bytes32',
							name: 'preimage',
							type: 'bytes32',
						},
					],
					stateMutability: 'view',
					type: 'function',
				},
				{
					inputs: [
						{
							internalType: 'bytes32',
							name: '_contractId',
							type: 'bytes32',
						},
					],
					name: 'haveContract',
					outputs: [
						{
							internalType: 'bool',
							name: 'exists',
							type: 'bool',
						},
					],
					stateMutability: 'view',
					type: 'function',
				},
				{
					inputs: [
						{
							internalType: 'address payable',
							name: '_receiver',
							type: 'address',
						},
						{
							internalType: 'bytes32',
							name: '_hashlock',
							type: 'bytes32',
						},
						{
							internalType: 'uint256',
							name: '_timelock',
							type: 'uint256',
						},
					],
					name: 'newContract',
					outputs: [
						{
							internalType: 'bytes32',
							name: 'contractId',
							type: 'bytes32',
						},
					],
					stateMutability: 'payable',
					type: 'function',
				},
				{
					inputs: [
						{
							internalType: 'bytes32',
							name: '_contractId',
							type: 'bytes32',
						},
					],
					name: 'refund',
					outputs: [
						{
							internalType: 'bool',
							name: '',
							type: 'bool',
						},
					],
					stateMutability: 'nonpayable',
					type: 'function',
				},
				{
					inputs: [
						{
							internalType: 'bytes32',
							name: '_contractId',
							type: 'bytes32',
						},
						{
							internalType: 'bytes32',
							name: '_preimage',
							type: 'bytes32',
						},
					],
					name: 'withdraw',
					outputs: [
						{
							internalType: 'bool',
							name: '',
							type: 'bool',
						},
					],
					stateMutability: 'nonpayable',
					type: 'function',
				},
			],
			inheritedFunctions: {},
		},
	},
	11155111: {
		HashedTimelock: {
			address: '0xe41751e2799Ca2d2790776a3834C3CC0e8797c67',
			abi: [
				{
					anonymous: false,
					inputs: [
						{ indexed: true, internalType: 'bytes32', name: 'contractId', type: 'bytes32' },
						{ indexed: true, internalType: 'address', name: 'sender', type: 'address' },
						{ indexed: true, internalType: 'address', name: 'receiver', type: 'address' },
						{ indexed: false, internalType: 'uint256', name: 'amount', type: 'uint256' },
						{ indexed: false, internalType: 'bytes32', name: 'hashlock', type: 'bytes32' },
						{ indexed: false, internalType: 'uint256', name: 'timelock', type: 'uint256' },
					],
					name: 'LogHTLCNew',
					type: 'event',
				},
				{
					anonymous: false,
					inputs: [{ indexed: true, internalType: 'bytes32', name: 'contractId', type: 'bytes32' }],
					name: 'LogHTLCRefund',
					type: 'event',
				},
				{
					anonymous: false,
					inputs: [{ indexed: true, internalType: 'bytes32', name: 'contractId', type: 'bytes32' }],
					name: 'LogHTLCWithdraw',
					type: 'event',
				},
				{
					inputs: [],
					name: 'calculateBounty',
					outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
					stateMutability: 'view',
					type: 'function',
				},
				{
					inputs: [{ internalType: 'bytes32', name: '_contractId', type: 'bytes32' }],
					name: 'getContract',
					outputs: [
						{ internalType: 'address', name: 'sender', type: 'address' },
						{ internalType: 'address', name: 'receiver', type: 'address' },
						{ internalType: 'uint256', name: 'amount', type: 'uint256' },
						{ internalType: 'bytes32', name: 'hashlock', type: 'bytes32' },
						{ internalType: 'uint256', name: 'timelock', type: 'uint256' },
						{ internalType: 'bool', name: 'withdrawn', type: 'bool' },
						{ internalType: 'bool', name: 'refunded', type: 'bool' },
						{ internalType: 'bytes32', name: 'preimage', type: 'bytes32' },
					],
					stateMutability: 'view',
					type: 'function',
				},
				{
					inputs: [{ internalType: 'bytes32', name: '_contractId', type: 'bytes32' }],
					name: 'haveContract',
					outputs: [{ internalType: 'bool', name: 'exists', type: 'bool' }],
					stateMutability: 'view',
					type: 'function',
				},
				{
					inputs: [
						{ internalType: 'address payable', name: '_receiver', type: 'address' },
						{ internalType: 'bytes32', name: '_hashlock', type: 'bytes32' },
						{ internalType: 'uint256', name: '_timelock', type: 'uint256' },
					],
					name: 'newContract',
					outputs: [{ internalType: 'bytes32', name: 'contractId', type: 'bytes32' }],
					stateMutability: 'payable',
					type: 'function',
				},
				{
					inputs: [{ internalType: 'bytes32', name: '_contractId', type: 'bytes32' }],
					name: 'refund',
					outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
					stateMutability: 'nonpayable',
					type: 'function',
				},
				{
					inputs: [
						{ internalType: 'bytes32', name: '_contractId', type: 'bytes32' },
						{ internalType: 'bytes32', name: '_preimage', type: 'bytes32' },
					],
					name: 'withdraw',
					outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
					stateMutability: 'nonpayable',
					type: 'function',
				},
				{
					inputs: [
						{ internalType: 'bytes32', name: '_contractId', type: 'bytes32' },
						{ internalType: 'bytes32', name: '_preimage', type: 'bytes32' },
					],
					name: 'withdrawWithBounty',
					outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
					stateMutability: 'nonpayable',
					type: 'function',
				},
			],
			inheritedFunctions: {},
		},
	},
	31337: {
		HashedTimelock: {
			address: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
			abi: [
				{
					anonymous: false,
					inputs: [
						{
							indexed: true,
							internalType: 'bytes32',
							name: 'contractId',
							type: 'bytes32',
						},
						{
							indexed: true,
							internalType: 'address',
							name: 'sender',
							type: 'address',
						},
						{
							indexed: true,
							internalType: 'address',
							name: 'receiver',
							type: 'address',
						},
						{
							indexed: false,
							internalType: 'uint256',
							name: 'amount',
							type: 'uint256',
						},
						{
							indexed: false,
							internalType: 'bytes32',
							name: 'hashlock',
							type: 'bytes32',
						},
						{
							indexed: false,
							internalType: 'uint256',
							name: 'timelock',
							type: 'uint256',
						},
					],
					name: 'LogHTLCNew',
					type: 'event',
				},
				{
					anonymous: false,
					inputs: [
						{
							indexed: true,
							internalType: 'bytes32',
							name: 'contractId',
							type: 'bytes32',
						},
					],
					name: 'LogHTLCRefund',
					type: 'event',
				},
				{
					anonymous: false,
					inputs: [
						{
							indexed: true,
							internalType: 'bytes32',
							name: 'contractId',
							type: 'bytes32',
						},
					],
					name: 'LogHTLCWithdraw',
					type: 'event',
				},
				{
					inputs: [
						{
							internalType: 'bytes32',
							name: '_contractId',
							type: 'bytes32',
						},
					],
					name: 'getContract',
					outputs: [
						{
							internalType: 'address',
							name: 'sender',
							type: 'address',
						},
						{
							internalType: 'address',
							name: 'receiver',
							type: 'address',
						},
						{
							internalType: 'uint256',
							name: 'amount',
							type: 'uint256',
						},
						{
							internalType: 'bytes32',
							name: 'hashlock',
							type: 'bytes32',
						},
						{
							internalType: 'uint256',
							name: 'timelock',
							type: 'uint256',
						},
						{
							internalType: 'bool',
							name: 'withdrawn',
							type: 'bool',
						},
						{
							internalType: 'bool',
							name: 'refunded',
							type: 'bool',
						},
						{
							internalType: 'bytes32',
							name: 'preimage',
							type: 'bytes32',
						},
					],
					stateMutability: 'view',
					type: 'function',
				},
				{
					inputs: [
						{
							internalType: 'bytes32',
							name: '_contractId',
							type: 'bytes32',
						},
					],
					name: 'haveContract',
					outputs: [
						{
							internalType: 'bool',
							name: 'exists',
							type: 'bool',
						},
					],
					stateMutability: 'view',
					type: 'function',
				},
				{
					inputs: [
						{
							internalType: 'address payable',
							name: '_receiver',
							type: 'address',
						},
						{
							internalType: 'bytes32',
							name: '_hashlock',
							type: 'bytes32',
						},
						{
							internalType: 'uint256',
							name: '_timelock',
							type: 'uint256',
						},
					],
					name: 'newContract',
					outputs: [
						{
							internalType: 'bytes32',
							name: 'contractId',
							type: 'bytes32',
						},
					],
					stateMutability: 'payable',
					type: 'function',
				},
				{
					inputs: [
						{
							internalType: 'bytes32',
							name: '_contractId',
							type: 'bytes32',
						},
					],
					name: 'refund',
					outputs: [
						{
							internalType: 'bool',
							name: '',
							type: 'bool',
						},
					],
					stateMutability: 'nonpayable',
					type: 'function',
				},
				{
					inputs: [
						{
							internalType: 'bytes32',
							name: '_contractId',
							type: 'bytes32',
						},
						{
							internalType: 'bytes32',
							name: '_preimage',
							type: 'bytes32',
						},
					],
					name: 'withdraw',
					outputs: [
						{
							internalType: 'bool',
							name: '',
							type: 'bool',
						},
					],
					stateMutability: 'nonpayable',
					type: 'function',
				},
			],
			inheritedFunctions: {},
		},
	},
	// 11155111: {
	//   HashedTimelock: {
	//     address: "0xd7B6Ee95a03d5C538C7C8E7370aFd88864b06506",
	//     abi: [
	//       {
	//         anonymous: false,
	//         inputs: [
	//           {
	//             indexed: true,
	//             internalType: "bytes32",
	//             name: "contractId",
	//             type: "bytes32",
	//           },
	//           {
	//             indexed: true,
	//             internalType: "address",
	//             name: "sender",
	//             type: "address",
	//           },
	//           {
	//             indexed: true,
	//             internalType: "address",
	//             name: "receiver",
	//             type: "address",
	//           },
	//           {
	//             indexed: false,
	//             internalType: "uint256",
	//             name: "amount",
	//             type: "uint256",
	//           },
	//           {
	//             indexed: false,
	//             internalType: "bytes32",
	//             name: "hashlock",
	//             type: "bytes32",
	//           },
	//           {
	//             indexed: false,
	//             internalType: "uint256",
	//             name: "timelock",
	//             type: "uint256",
	//           },
	//         ],
	//         name: "LogHTLCNew",
	//         type: "event",
	//       },
	//       {
	//         anonymous: false,
	//         inputs: [
	//           {
	//             indexed: true,
	//             internalType: "bytes32",
	//             name: "contractId",
	//             type: "bytes32",
	//           },
	//         ],
	//         name: "LogHTLCRefund",
	//         type: "event",
	//       },
	//       {
	//         anonymous: false,
	//         inputs: [
	//           {
	//             indexed: true,
	//             internalType: "bytes32",
	//             name: "contractId",
	//             type: "bytes32",
	//           },
	//         ],
	//         name: "LogHTLCWithdraw",
	//         type: "event",
	//       },
	//       {
	//         inputs: [
	//           {
	//             internalType: "bytes32",
	//             name: "_contractId",
	//             type: "bytes32",
	//           },
	//         ],
	//         name: "getContract",
	//         outputs: [
	//           {
	//             internalType: "address",
	//             name: "sender",
	//             type: "address",
	//           },
	//           {
	//             internalType: "address",
	//             name: "receiver",
	//             type: "address",
	//           },
	//           {
	//             internalType: "uint256",
	//             name: "amount",
	//             type: "uint256",
	//           },
	//           {
	//             internalType: "bytes32",
	//             name: "hashlock",
	//             type: "bytes32",
	//           },
	//           {
	//             internalType: "uint256",
	//             name: "timelock",
	//             type: "uint256",
	//           },
	//           {
	//             internalType: "bool",
	//             name: "withdrawn",
	//             type: "bool",
	//           },
	//           {
	//             internalType: "bool",
	//             name: "refunded",
	//             type: "bool",
	//           },
	//           {
	//             internalType: "bytes32",
	//             name: "preimage",
	//             type: "bytes32",
	//           },
	//         ],
	//         stateMutability: "view",
	//         type: "function",
	//       },
	//       {
	//         inputs: [
	//           {
	//             internalType: "bytes32",
	//             name: "_contractId",
	//             type: "bytes32",
	//           },
	//         ],
	//         name: "haveContract",
	//         outputs: [
	//           {
	//             internalType: "bool",
	//             name: "exists",
	//             type: "bool",
	//           },
	//         ],
	//         stateMutability: "view",
	//         type: "function",
	//       },
	//       {
	//         inputs: [
	//           {
	//             internalType: "address payable",
	//             name: "_receiver",
	//             type: "address",
	//           },
	//           {
	//             internalType: "bytes32",
	//             name: "_hashlock",
	//             type: "bytes32",
	//           },
	//           {
	//             internalType: "uint256",
	//             name: "_timelock",
	//             type: "uint256",
	//           },
	//         ],
	//         name: "newContract",
	//         outputs: [
	//           {
	//             internalType: "bytes32",
	//             name: "contractId",
	//             type: "bytes32",
	//           },
	//         ],
	//         stateMutability: "payable",
	//         type: "function",
	//       },
	//       {
	//         inputs: [
	//           {
	//             internalType: "bytes32",
	//             name: "_contractId",
	//             type: "bytes32",
	//           },
	//         ],
	//         name: "refund",
	//         outputs: [
	//           {
	//             internalType: "bool",
	//             name: "",
	//             type: "bool",
	//           },
	//         ],
	//         stateMutability: "nonpayable",
	//         type: "function",
	//       },
	//       {
	//         inputs: [
	//           {
	//             internalType: "bytes32",
	//             name: "_contractId",
	//             type: "bytes32",
	//           },
	//           {
	//             internalType: "bytes32",
	//             name: "_preimage",
	//             type: "bytes32",
	//           },
	//         ],
	//         name: "withdraw",
	//         outputs: [
	//           {
	//             internalType: "bool",
	//             name: "",
	//             type: "bool",
	//           },
	//         ],
	//         stateMutability: "nonpayable",
	//         type: "function",
	//       },
	//     ],
	//     inheritedFunctions: {},
	//   },
	// },
} as const;

export default deployedContracts;
