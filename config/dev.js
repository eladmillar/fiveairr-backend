// module.exports = {
//   dbURL: 'mongodb://127.0.0.1:27017',
//   dbName: 'tester_db',
// }
require('dotenv').config()
module.exports = {
  dbURL: process.env.ATLAS_URL,
  dbName: process.env.ATLAS_DB_NAME,
}
