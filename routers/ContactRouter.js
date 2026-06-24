const ContactRouter = require("express").Router()
const { sendContactEmail } = require("../controller/ContactController")

ContactRouter.post("/send", sendContactEmail)

module.exports = ContactRouter
