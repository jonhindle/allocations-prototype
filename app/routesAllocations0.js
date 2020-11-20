const router = require('express').Router()
const { body, validationResult } = require('express-validator')
const { serviceUsers:rawServiceUsers, probationPractitioners } = require('./views/allocations/0/data.json')

const now = Date.now()
const serviceUsers = rawServiceUsers.map(serviceUser => {
  return { ...serviceUser, sla: Math.round((new Date(serviceUser.sentenceStart.split('/').reverse().join('-')).getTime()-now)/86400000) }
})

const getErrorMessages = req => {
  const errors = validationResult(req)
  if(errors.isEmpty()) return null
  return errors.array().reduce((current, { param, msg }) => {
    if (!current[param]) current[param] = []
    current[param].push(msg)
    return current
  }, {})
}
const getUser = crn => {
  const serviceUser = serviceUsers.find(({ crn:userCrn }) => crn === userCrn)
  return { serviceUser, crn }
}
const getUserAndPractitioner = crn => {
  const { serviceUser } = getUser(crn)
  if(!serviceUser) return { crn }
  const { currentOM } = serviceUser
  const probationPractitioner = probationPractitioners.find(({ id }) => id === currentOM)
  return { serviceUser, probationPractitioner, crn }
}

router.route('/service-user/:crn')
  .get(({ params: { crn } }, res) => {
    res.render('allocations/0/service-user', { ...getUserAndPractitioner(crn) })
  })
  .post([body('transfer-reason', 'Please give reasons for transfer request').notEmpty()],
    (req, res) => {
      const { params: { crn } } = req
      const errors = getErrorMessages(req)
      if (errors) {
        return res.render('allocations/0/service-user', { errors, ...getUserAndPractitioner(crn) })
      }
      return res.redirect(`/allocations/0/new-allocations`)
    }
  )

router.route('/new-service-user/:crn')
  .get(({ params: { crn } }, res) => {
    res.render('allocations/0/new-service-user', { ...getUser(crn) })
  })
  .post([body('serviceUserAction', 'Please select an action').isIn(['accept', 'reject'])],
    (req, res) => {
      const { body: { serviceUserAction }, params: { crn } } = req
      const errors = getErrorMessages(req)
      if (errors) {
        return res.render('allocations/0/new-service-user', { errors, ...getUser(crn) })
      }
      if(serviceUserAction === 'accept') return res.redirect(`/allocations/0/allocate/${crn}`)
      if(serviceUserAction === 'reject') return res.redirect(`/allocations/0/new-allocations`)
    }
  )

router.route('/allocate/:crn')
  .get(({ params: { crn }, query }, res) => {
    res.render('allocations/0/allocate', { query, probationPractitioners, ...getUser(crn) })
  })
  .post([body('allocate-OM', 'Please select an officer').isInt()],
    (req, res) => {
      const { params: { crn }, query } = req
      const errors = getErrorMessages(req)
      if (errors) {
        return res.render('allocations/0/allocate', { errors, query, probationPractitioners, ...getUser(crn) })
      }
      return res.redirect(`/allocations/0/new-allocations`)
    }
  )

router.get('*', ({ path, query }, res) => {
  res.render(`allocations/0${path}`, { query, serviceUsers, probationPractitioners })
})

module.exports = router
