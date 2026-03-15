const router = require('express').Router()
const auth = require('../middleware/auth')
const { searchContacts, getAllContacts, getContactsForList, deleteDm } = require('../controllers/contactController')

router.use(auth)
router.post('/search', searchContacts)
router.get('/all-contacts', getAllContacts)
router.get('/get-contacts-for-list', getContactsForList)
router.delete('/delete-dm/:dmId', deleteDm)

module.exports = router
