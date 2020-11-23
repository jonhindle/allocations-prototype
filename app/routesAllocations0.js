const router = require('express').Router()
const { body, validationResult } = require('express-validator')
const { serviceUsers: rawServiceUsers, probationPractitioners: rawProbationPractitioners } = require('./views/allocations/0/data.json')

const today = Date.now()

const getErrorMessages = req => {
  const errors = validationResult(req)
  if(errors.isEmpty()) return null
  return errors.array().reduce((current, { param, msg }) => {
    if (!current[param]) current[param] = []
    current[param].push(msg)
    return current
  }, {})
}
const getUser = (crn, serviceUsers) => {
  const serviceUser = serviceUsers.find(({ crn:userCrn }) => crn === userCrn)
  return { serviceUser, crn }
}
const getPractitioner = (findId, probationPractitioners) => {
  return probationPractitioners.find(({ id }) => id == findId)
}

const getUserAndPractitioner = (crn, serviceUsers, probationPractitioners) => {
  const { serviceUser } = getUser(crn, serviceUsers)
  if(!serviceUser) return { crn }
  const probationPractitioner = getPractitioner(serviceUser.currentOM, probationPractitioners)
  return { serviceUser, probationPractitioner, crn }
}

const updateDate = (beginningOfTime, ob, param) => {
  const updatedDate = (Number.isInteger(ob[param]) && ob[param] != 0 ? new Date(beginningOfTime+(ob[param]*86400000)) : new Date(beginningOfTime))
  ob[param] = `${updatedDate.getDate()} ${updatedDate.toLocaleDateString('en-GB', {month: "short"})} ${updatedDate.getFullYear()}`

}
const updateDates = (beginningOfTime, ob, params) => params.forEach(param => updateDate(beginningOfTime, ob, param))

router.use('*', (req, res, next) => {
    if(!req.locals) req.locals = {}
    next()
  },({ session: { data }, locals }, res, next) => {
    if( Object.keys(data).length == 0 ) {
      console.log(`**** Resetting all session data ****`)
      data.beginningOfTime = today
    }
    const { beginningOfTime } = data
    locals.serviceUsers = rawServiceUsers.map(rawServiceUser => {
      const serviceUser = {...rawServiceUser}
      updateDates(beginningOfTime, serviceUser, [ 'sentenceStart', 'sentenceEnd', 'allocationDate' ])
      serviceUser.sla = Math.round((new Date(serviceUser.sentenceStart).getTime()-today)/86400000)
      serviceUser.currentOM = data[`${serviceUser.crn}_currentOM`] || serviceUser.currentOM
      return serviceUser
    })
    locals.probationPractitioners = rawProbationPractitioners.map(rawProbationPractitioner => {
      const probationPractitioner = {...rawProbationPractitioner}
      updateDates(beginningOfTime, probationPractitioner, ['lastAllocated'])
      return probationPractitioner
    })
    next()
  }
)

router.route('/service-user/:crn')
  .get(({ params: { crn }, locals: { serviceUsers, probationPractitioners } }, res) => {
    res.render('allocations/0/service-user', { ...getUserAndPractitioner(crn, serviceUsers, probationPractitioners) })
  })
  .post([body('transfer-reason', 'Please give reasons for transfer request').notEmpty()],
    (req, res) => {
      const { params: { crn }, locals: { serviceUsers, probationPractitioners } } = req
      const errors = getErrorMessages(req)
      if (errors) {
        return res.render('allocations/0/service-user', { errors, ...getUserAndPractitioner(crn, serviceUsers, probationPractitioners) })
      }
      return res.redirect(`/allocations/0/new-allocations`)
    }
  )

router.route('/new-service-user/:crn')
  .get(({ params: { crn }, locals: { serviceUsers } }, res) => {
    res.render('allocations/0/new-service-user', { ...getUser(crn, serviceUsers) })
  })
  .post([body('serviceUserAction', 'Please select an action').isIn(['accept', 'reject'])],
    (req, res) => {
      const { session: { data }, body: { serviceUserAction }, params: { crn }, locals: { serviceUsers } } = req
      const errors = getErrorMessages(req)
      if (errors) {
        return res.render('allocations/0/new-service-user', { errors, ...getUser(crn, serviceUsers) })
      }
      if(serviceUserAction === 'accept') return res.redirect(`/allocations/0/allocate/${crn}`)
      if(serviceUserAction === 'reject') {
        data[`${crn}_rejected`] = true
        return res.redirect(`/allocations/0/success/${crn}`)
      }
    }
  )

router.route('/allocate/:crn')
  .get(({ params: { crn }, query, locals: { serviceUsers, probationPractitioners } }, res) => {
    res.render('allocations/0/allocate', { query, probationPractitioners, ...getUser(crn, serviceUsers) })
  })
  .post([body('allocate-OM', 'Please select an officer').isInt()],
    (req, res) => {
      const { body, session: { data }, params: { crn }, query, locals: {serviceUsers, probationPractitioners} } = req
      const errors = getErrorMessages(req)
      const { serviceUser } = getUser(crn, serviceUsers)
      if (errors) {
        return res.render('allocations/0/allocate', { errors, query, probationPractitioners, crn, serviceUser })
      }
      const allocateOM = body['allocate-OM']
      //const probationPractitioner = getPractitioner(allocateOM, probationPractitioners)
      serviceUser.previousCurrentOM = serviceUser.currentOM
      serviceUser.currentOM = allocateOM
      //probationPractitioner.lastAllocated = 
      data[`${crn}_currentOM`] = allocateOM
      return res.redirect(`/allocations/0/success/${crn}`)
    }
  )

router.get('/success/:crn', ({ params: { crn }, session: { data }, query, locals: { serviceUsers, probationPractitioners } }, res) => {
  if(data[`${crn}_rejected`]) return res.render('allocations/0/success', { query, ...getUser(crn, serviceUsers) })
  console.log(JSON.stringify(getUserAndPractitioner(crn, serviceUsers, probationPractitioners)))
  return res.render('allocations/0/success', { query, ...getUserAndPractitioner(crn, serviceUsers, probationPractitioners) })
})

router.get('*', ({ session: { data }, path, query, locals: {serviceUsers, probationPractitioners} }, res) => {
  const todaysDate = new Date(today).toLocaleDateString('en-GB', {day: "numeric", month: "long", year: "numeric"})
  const lastAllocated = probationPractitioners.reduce((current, { lastAllocated = 0 }) => {
    return new Date(current) > new Date(lastAllocated) ? current : lastAllocated
  })
  const lastUpdateDate = new Date(lastAllocated).toLocaleDateString('en-GB', {day: "numeric", month: "long", year: "numeric"})
  res.render(`allocations/0${path}`, { query, serviceUsers: serviceUsers.filter(({ crn }) => !data[`${crn}_rejected`] ), probationPractitioners, todaysDate, lastUpdateDate })
})

module.exports = router
