const gigService = require('../api/gig/gig.service')
const logger = require('./logger.service')

var gIo = null

function setupSocketAPI(http) {
  gIo = require('socket.io')(http, {
    cors: {
      origin: '*',
    },
  })
  gIo.on('connection', socket => {
    socket.on('disconnect', socket => {})

    socket.on('chat-set-topic', topic => {
      if (socket.myTopic === topic) return
      if (socket.myTopic) {
        socket.leave(socket.myTopic)
      }

      socket.join(topic)
      socket.myTopic = topic
    })

    socket.on('gig-ordered', async gig => {
      socket.join('watching:' + gig.owner.username)
      socket.emit(
        'order-approved',
        `Hey ${socket.username}! \nYour order is being processed. stay tuned.`
      )

      const toSocket = await _getUserSocket(gig.owner._id)
      if (toSocket)
        toSocket.emit(
          'user-ordered-gig',
          `Hey ${gig.owner.username}! \nA user has just ordered one of your gigs right now.`
        )
      return
    })

    socket.on('user-watch', async user => {
      socket.join('watching:' + user.username)

      const toSocket = await _getUserSocket(user._id)
      if (toSocket)
        toSocket.emit(
          'user-is-watching',
          `Hey ${user.username}! A user is watching your gig right now.`
        )
      return
    })

    socket.on('order-change-status', async buyer => {
      socket.join('watching:' + buyer.username)

      const toSocket = await _getUserSocket(buyer._id)
      if (toSocket)
        toSocket.emit(
          'order-status-update',
          `Hey ${buyer.username}! \nYour order's status has been changed.`
        )
      return
    })

    socket.on('chat-send-msg', msg => {
      broadcast({
        type: 'chat-add-msg',
        data: msg,
        room: socket.myTopic,
        userId: socket.userId,
      })
      gigService.addGigMsg(socket.myTopic, msg)
    })

    socket.on('chat-set-user-is-typing', username => {
      socket.broadcast.to(socket.myTopic).emit('chat-user-is-typing', username)
    })

    // socket.on('shop-admin-changed')
    socket.on('set-user-socket', userId => {
      socket.userId = userId
    })

    socket.on('unset-user-socket', () => {
      delete socket.userId
    })
  })
}

function emitTo({ type, data, label }) {
  if (label) gIo.to('watching:' + label.toString()).emit(type, data)
  else gIo.emit(type, data)
}

async function emitToUser({ type, data, userId }) {
  userId = userId.toString()
  const socket = await _getUserSocket(userId)

  if (socket) {
    socket.emit(type, data)
  } else {
    logger.info(`No active socket for user: ${userId}`)
    // _printSockets()
  }
}

// If possible, send to all sockets BUT not the current socket
// Optionally, broadcast to a room / to all
async function broadcast({ type, data, room = null, userId = '' }) {
  userId = userId.toString()

  logger.info(`Broadcasting event: ${type}`)
  const excludedSocket = await _getUserSocket(userId)
  if (room && excludedSocket) {
    excludedSocket.broadcast.to(room).emit(type, data)
  } else if (excludedSocket) {
    excludedSocket.broadcast.emit(type, data)
  } else if (room) {
    gIo.to(room).emit(type, data)
  } else {
    gIo.emit(type, data)
  }
}

async function broadcastAdminUpdate({ productName, type, adminId }) {
  return broadcast({
    type: 'admin-update',
    data: _getAdminMsg(productName, type),
    userId: adminId,
  })
}

async function _getUserSocket(userId) {
  const sockets = await _getAllSockets()
  const socket = sockets.find(s => s.userId === userId)
  return socket
}

async function _getAllSockets() {
  // return all Socket instances
  const sockets = await gIo.fetchSockets()
  return sockets
}

function _getAdminMsg(productName, type) {
  let suffix = 'go check it out!'
  if (type === 'remove') suffix = 'it is no longer available.'
  return `An admin has ${type}ed ${productName}, ${suffix}`
}

async function _printSockets() {
  const sockets = await _getAllSockets()
  console.log(`Sockets: (count: ${sockets.length}):`)
  sockets.forEach(_printSocket)
}
function _printSocket(socket) {
  console.log(`Socket - socketId: ${socket.id} userId: ${socket.userId}`)
}

module.exports = {
  // set up the sockets service and define the API
  setupSocketAPI,
  // emit to everyone / everyone in a specific room (label)
  emitTo,
  // emit to a specific user (if currently active in system)
  emitToUser,
  // Send to all sockets BUT not the current socket - if found
  // (otherwise broadcast to a room / to all)
  broadcast,
  broadcastAdminUpdate,
}
