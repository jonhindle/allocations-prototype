const { get } = require('browser-sync')
const express = require('express')
const router = express.Router()
const { serviceUsers, probationPractitioners } = require('./views/allocations/0/data.json')

// Add your routes here - above the module.exports line

router.get('/allocations/0/*', ({ path, query, originalUrl }, res) => {
  console.log(query)
  res.render(path.substring(1), { query, serviceUsers, probationPractitioners })
})

module.exports = router
