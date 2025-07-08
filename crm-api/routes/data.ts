
import { getDataController } from "../controllers/getData";


const express  = require('express');

const router = express.Router();
console.log('data route');
router.get('/', getDataController);

module.exports = router;