const CategoryModel = require("../models/CategoryModel")
const imageName = require("../Utils/Helper")
const fs = require("fs")
const path = require("path")

const { sendSuccess, sendCreated, notFound, serverError, sendOk, deletedError, sendBadRequest, sendConflict } = require("../Utils/Response")

// Helper — silently delete a file if it exists
function deleteFile(filePath) {
    fs.unlink(filePath, (err) => {
        if (err && err.code !== "ENOENT") {
            console.log("Could not delete file:", filePath, err.message)
        }
    })
}

const CreateCategory = async (req, res) => {
    try {
        const { name, slug } = req.body
        const image = req.files.image

        if (!name || !slug || !image) return sendBadRequest(res)

        const category = await CategoryModel.findOne({ name })

        if (category) return sendConflict(res)

        const img_name = imageName(image.name)

        const destination = `./public/category/${img_name}`

        image.mv(destination, async (err) => {
            if (err) {
                return serverError(res, "Unable to load image")
            }
            await CategoryModel.create({ name, slug, image: img_name })
            return sendSuccess(res)
        })



    } catch (error) {
        serverError(res)
    }
}


const read = async (req, res) => {
    try {

        const query = req.query
        const filter = {}
        const limit = query.limit ? parseInt(query.limit) : 0
        if (query._id) filter._id = query.id
        if (query.status) filter.status = query.status === "true"
        if (query.is_home) filter.is_home = query.is_home === "true"
        if (query.is_top) filter.is_top = query.is_top === "true"
        if (query.is_popular) filter.is_popular = query.is_popular === "true"



        const data = await CategoryModel.find(filter).limit(limit)
        const total = await CategoryModel.countDocuments()
        sendSuccess(res, data, {
            total,
            ImageBaseUrl: "http://localhost:5000/category/"
        })
    } catch (error) {
        console.log("ERROR:", error)
        return serverError(res)
    }
}

const readById = async (req, res) => {
    try {
        const id = req.params.id
        const total = await CategoryModel.countDocuments()
        const meta = {
            total,
            ImageBaseUrl: "http://localhost:5000/category/"
        }
        const category = await CategoryModel.findById(id)
        if (category) {
            return sendSuccess(res, category, meta)
        }
    } catch (error) {
        return serverError(res)
    }
}


const UpdateCategory = async (req, res) => {
    try {
        const { field } = req.body
        const id = req.params.id
        const fields = ["is_top", "is_home", "is_popular", "status"]
        const category = await CategoryModel.findById(id)
        if (!category) {
            return notFound(res)
        }

        if (!fields.includes(field)) return sendBadRequest(res)

        await CategoryModel.findByIdAndUpdate(id, {
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


const deleteCategory = async (req, res) => {
    try {
        const id = req.params.id

        const category = await CategoryModel.findByIdAndDelete(id)

        // Delete category image from public/category/
        if (category && category.image) {
            deleteFile(path.join(".", "public", "category", category.image))
        }

        deletedError(res)

    } catch (error) {
        return serverError(res)
    }
}

// update Category API

const update = async (req, res) => {
    try {
        const image = req.files?.image || null
        const id = req.params.id

        const category = await CategoryModel.findById(id)
        if (!category) {
            return notFound(res)
        }

        const object = {}

        if (req.body.name) {
            object.name = req.body.name;
            object.slug = req.body.slug;
        }

        if (image) {
            // Delete old image before saving new one
            if (category.image) {
                deleteFile(path.join(".", "public", "category", category.image))
            }
            const category_image = imageName(image.name)
            const destination = `./public/category/${category_image}`

            await image.mv(destination)
            object.image = category_image
        }

        await CategoryModel.updateOne(
            { _id: category._id },
            { $set: object }
        )


        sendSuccess(res)
    } catch (error) {
        console.log(error)
        return serverError(res)
    }
}


module.exports = { CreateCategory, read, UpdateCategory, deleteCategory, readById, update }