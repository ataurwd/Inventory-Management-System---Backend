import { Router } from 'express';
import { handleChat } from './chat.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';

const router = Router();

// Protect all chat routes and restrict to admins
router.use(authenticate);
router.use(authorize('admin'));

router.post('/', handleChat);

export default router;
