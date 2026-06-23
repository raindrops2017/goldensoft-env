import { Router } from 'express';
import { OptionsController } from './options.controller';

const router = Router();

router.get('/', OptionsController.getOptions);

export default router;
