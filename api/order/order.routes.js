const express = require('express')
const { requireAuth } = require('../../middlewares/requireAuth.middleware')
const { log } = require('../../middlewares/logger.middleware')
const {
  getOrders,
  getOrderById,
  addOrder,
  updateOrder,
  removeOrder,
} = require('./order.controller')
const router = express.Router()

router.get('/', log, getOrders)
router.get('/:id', getOrderById)
router.post('/', requireAuth, addOrder)
router.put('/:id', requireAuth, updateOrder)
router.delete('/:id', requireAuth, removeOrder)

module.exports = router
