import express from 'express';
import { getCounties, getSubCounties, getWards } from '../controllers/locationController.js';
import { validate } from '../middlewares/validateMiddlewares.js';
import { locationSearchQuerySchema } from '../validators/locationValidator.js';

const router = express.Router();
const getRoute = (path, ...handlers) => {
  router.get(path, ...handlers);
  router.get(`/api/locations${path === '/' ? '' : path}`, ...handlers);
};

getRoute('/counties', validate(locationSearchQuerySchema, 'query'), getCounties);
getRoute('/counties/:countyId/sub-counties', getSubCounties);
getRoute('/sub-counties/:subCountyId/wards', getWards);

export default router;