const ColorModel = require("../models/ColorModel")
const { sendConflict, sendBadRequest, sendSuccess, serverError, notFound } = require("../Utils/Response")


const create = async (req, res) => {
    try {
        const { name, slug, color_code } = req.body

        const color = await ColorModel.findOne({ slug })

        if (color) return sendConflict(res)

        if (!name || !slug || !color_code) return sendBadRequest(res, "Color already exist")

        await ColorModel.create({ name, slug, color_code })
        return sendSuccess(res)

    } catch (error) {
        console.log(error)
        return serverError(res)
    }

}


const read = async (req, res) => {
    try {

        const query = req.query
        const filter = {}
        const limit = query.limit ? parseInt(query.limit) : 0
        if (query._id) filter._id = query.id
        if (query.status) filter.status = query.status === "true"

        const color = await ColorModel.find(filter).limit(limit)
        if (!color) return notFound(res, "Color Not Found")
        const total = await ColorModel.countDocuments()
        sendSuccess(res, color, {
            total,
        })

    } catch (error) {
        console.log(error)
        return serverError(res)
    }

}

const deleteColor = async (req, res) => {
    try {

        const id = req.params.id

        const color = await ColorModel.findByIdAndDelete(id)
        sendSuccess(res, color)

    } catch (error) {
        console.log(error)
        return 
    }
}

const Update_status = async (req, res) => {
    try {
        const { field } = req.body
        const id = req.params.id
        const fields = ["is_top", "is_home", "is_popular", "status"]
        const category = await ColorModel.findById(id)
        if (!category) {
            return notFound(res)
        }

        if (!fields.includes(field)) return sendBadRequest(res)

        await ColorModel.findByIdAndUpdate(id, {
            [field]: !category[field]
        })

        res.status(202).json({
            msg: "Student Status Updated",
            success: true,
            data: category
        })

    } catch (error) {
        return serverError(res)
    }
}

module.exports = { create, read, deleteColor, Update_status }