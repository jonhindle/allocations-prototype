const { get } = require('browser-sync')
const express = require('express')
const router = express.Router()
const { serviceUsers, probationPractitioners } = require('./views/allocations/0/data.json')

// Add your routes here - above the module.exports line

router.get('/allocations/0/*', ({ path, query, originalUrl }, res) => {
  console.log(query)
  const now = Date.now()
  const processedServiceUsers = serviceUsers.map(serviceUser => {
    return { ...serviceUser, sla: Math.round((new Date(serviceUser.sentenceStart.split('/').reverse().join('-')).getTime()-now)/86400000) }
  })
  console.log(JSON.stringify(processedServiceUsers))
  res.render(path.substring(1), { query, serviceUsers: processedServiceUsers, probationPractitioners })
})

module.exports = router
