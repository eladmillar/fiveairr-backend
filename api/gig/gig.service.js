const dbService = require('../../services/db.service')
const logger = require('../../services/logger.service')
const utilService = require('../../services/util.service')
const { ObjectId } = require('mongodb')

async function query(filterBy, sortBy) {
  try {
    const criteria = _buildCriteria(filterBy)
    const collection = await dbService.getCollection('gig')
    var gigs = await collection.find(criteria).toArray()
    return gigs
  } catch (err) {
    logger.error('cannot find gigs', err)
    throw err
  }
}

async function getById(gigId) {
  try {
    const collection = await dbService.getCollection('gig')
    const gig = collection.findOne({ _id: new ObjectId(gigId) })
    return gig
  } catch (err) {
    logger.error(`while finding gig ${gigId}`, err)
    throw err
  }
}

async function remove(gigId) {
  try {
    const collection = await dbService.getCollection('gig')
    const {
      value: { name },
    } = await collection.findOneAndDelete({ _id: new ObjectId(gigId) })
    return name
  } catch (err) {
    logger.error(`cannot remove gig ${gigId}`, err)
    throw err
  }
}

async function add(gig) {
  try {
    const collection = await dbService.getCollection('gig')
    const { insertedId } = await collection.insertOne(gig)
    gig._id = insertedId
    return gig
  } catch (err) {
    logger.error('cannot insert gig', err)
    throw err
  }
}

async function update(gig) {
  try {
    const gigToSave = {
      title: gig.title,
      about: gig.about,
      price: gig.price,
      images: gig.images,
      description: gig.description,
      daysToMake: gig.daysToMake,
    }
    const collection = await dbService.getCollection('gig')
    await collection.updateOne(
      { _id: new ObjectId(gig._id) },
      { $set: gigToSave }
    ) //OK??
    return gig
  } catch (err) {
    logger.error(`cannot update gig ${gig._id}`, err)
    throw err
  }
}

async function addGigMsg(gigId, msg) {
  try {
    msg.id = utilService.makeId()
    const collection = await dbService.getCollection('gig')
    await collection.updateOne(
      { _id: new ObjectId(gigId) },
      { $push: { msgs: msg } }
    )
    return msg
  } catch (err) {
    logger.error(`cannot add gig msg ${gigId}`, err)
    throw err
  }
}

async function removeGigMsg(gigId, msgId) {
  try {
    const collection = await dbService.getCollection('gig')
    await collection.updateOne(
      { _id: new ObjectId(gigId) },
      { $pull: { msgs: { id: msgId } } }
    )
    return msgId
  } catch (err) {
    logger.error(`cannot add gig msg ${gigId}`, err)
    throw err
  }
}

function _buildCriteria(
  filterBy = { category: '', subCategory: '', title: '' }
) {
  let { category, subCategory, title, min, max, delivery } = filterBy

  const criteria = {}

  if (min && max) {
    min = +min
    max = +max
    criteria.price = { $gte: min, $lte: max }
  }

  if (category) {
    criteria.category = category
  }

  if (subCategory) {
    criteria.subCategory = subCategory
  }

  if (title) {
    criteria.title = { $regex: title, $options: 'i' }
  }

  if (delivery) {
    delivery = +delivery
    criteria.daysToMake = { $lte: delivery }
  }

  return criteria
}

module.exports = {
  remove,
  query,
  getById,
  add,
  update,
  addGigMsg,
  removeGigMsg,
}
