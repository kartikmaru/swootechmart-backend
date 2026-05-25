const sendSuccess = (res, data = {}, meta = {}, msg = "Success") => {
    return res.status(200).json({
        success: true,
        msg,
        data,
        meta
    })
}

// created success

const sendCreated = (res, msg = "Data Created", data = {}) => {
    return res.status(201).json({
        success: true,
        msg,
        data
    })
}

// Not found Page

const notFound = (res, msg = "Page Not Found", data = {}) => {
    return res.status(404).json({
        success: true,
        msg,
        data
    })
}

// Internal Server Error

const serverError = (res, error) => {
    console.log(error)
    return res.status(500).json({
        msg: "Internal Server Error",
        success: false
    })
}

// updated Succesfully

const sendOk = (res, msg = "Updated Succesfully", data = {}) => {
    return res.status(200).json({
        succes: true,
        msg,
        data
    })
}

// Deleted Successfully

const deletedError = (res, msg = "Succesfully Deleted", data = {}) => {
    return res.status(200).json({
        success: true,
        msg,
        data
    })
}

// Bad Request 

const sendBadRequest = (res, msg = "Validation Error") => {
    return res.status(400).json({
        success: false,
        msg
    })
}

// Send Conflict

const sendConflict = (res, msg = "Data Already Exists") => {
    return res.status(409).json({
        success: false,
        msg
    })
}


module.exports = { sendSuccess, sendCreated, notFound, serverError, sendOk, deletedError, sendBadRequest, sendConflict }