import { createLogger, format, transports } from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

const logger = createLogger({
	level: 'info',
	format: format.combine(format.timestamp(), format.json()),
	transports: [
		new DailyRotateFile({
			filename: 'logs/application-%DATE%.log',
			datePattern: 'YYYY-MM-DD-HH',
			zippedArchive: true, // Compress logs to save space
			maxSize: '20m', // Maximum file size before rotating
			maxFiles: '72h', // Keep logs for the last 72 hours
		}),
		new transports.Console({
			format: format.simple(),
		}),
	],
});

export default logger;
