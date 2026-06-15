import { Request, Response, NextFunction } from 'express';
import { chatService } from './chat.service';
import { ApiError } from '../../utils/api-error.util';

export const handleChat = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { messages } = req.body;

    if (!Array.isArray(messages)) {
      throw ApiError.badRequest('Messages must be an array');
    }

    const updatedMessages = await chatService.processChat(messages);

    res.status(200).json({
      status: 'success',
      data: {
        messages: updatedMessages,
      },
    });
  } catch (error) {
    next(error);
  }
};
