import { Request, Response, NextFunction } from 'express';
import * as transactionService from './transaction.service';
import { success, paginated } from '../../utils/api-response.util';

export async function getProductTransactions(req: Request, res: Response, next: NextFunction) {
  try {
    const { productId } = req.params;
    const transactions = await transactionService.getByProduct(productId);
    return success(res, transactions);
  } catch (error) {
    next(error);
  }
}

export async function getAllTransactions(req: Request, res: Response, next: NextFunction) {
  try {
    const type = req.query.type?.toString();
    const from = req.query.from?.toString();
    const to = req.query.to?.toString();
    const search = req.query.search?.toString();
    const page = parseInt(req.query.page?.toString() || '1') || 1;
    const limit = parseInt(req.query.limit?.toString() || '20') || 20;

    const result = await transactionService.getTransactions({ type, from, to, search }, page, limit);
    return paginated(res, result.transactions, result.meta);
  } catch (error) {
    next(error);
  }
}

export async function getTransactionSummary(req: Request, res: Response, next: NextFunction) {
  try {
    const from = req.query.from?.toString();
    const to = req.query.to?.toString();

    const summary = await transactionService.getSummary(from, to);
    return success(res, summary);
  } catch (error) {
    next(error);
  }
}

export async function getReport(req: Request, res: Response, next: NextFunction) {
  try {
    const from = req.query.from?.toString();
    const to = req.query.to?.toString();
    const groupBy = (req.query.groupBy?.toString() === 'week' ? 'week' : 'day') as 'day' | 'week';

    const revenue = await transactionService.getRevenueReport(from, to, groupBy);
    const waste = await transactionService.getWasteReport(from, to, groupBy);

    return success(res, { revenue, waste });
  } catch (error) {
    next(error);
  }
}
