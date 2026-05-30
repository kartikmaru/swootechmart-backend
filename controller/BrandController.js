const BrandModel = require("../models/BrandModel");
const imageName = require("../Utils/Helper");
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

const createBrand = async (req, res) => {
    try {
        const { name, slug, categoryId } = req.body;
        const image = req.files.image

        if (!name || !slug || !categoryId || !image) return sendBadRequest(res);

        const brand = await BrandModel.findOne({ name })

        if (brand) return sendConflict(res);

        const img_name = imageName(image.name)

        const destination = `./public/brand/${img_name}`

        image.mv(destination, async (err) => {
            if (err) {
                return sendBadRequest(res, "Unable to Fetch Image")
            }
            else {
                await BrandModel.create({ name, slug, categoryId: JSON.parse(categoryId), image: img_name })
                sendSuccess(res)
            }
        })





    } catch (error) {
        return serverError(res)
    }
}

const readBrand = async (req, res) => {
    try {

        const query = req.query

        const filter = {}

        const limit = query.limit ? parseInt(query.limit) : 0

        if (query.id) filter._id = query.id
        if (query.status) filter.staus = query.status === "true"
        if (query.is_home) filter.is_home = query.is_home === "true"
        if (query.is_top) filter.is_top = query.is_top === "true"
        if (query.is_popular) filter.is_popular = query.is_popular === "true"

        const data = await BrandModel.find().populate("categoryId")
        const total = await BrandModel.countDocuments()
        return sendSuccess(res, data, {
            total: total,
            imageBaseUrl: "http://localhost:5000/brand/"
        })
    } catch (error) {
        return serverError(res)
    }
}

const readById = async (req, res) => {
    try {
        const id = req.params.id
        const brand = await BrandModel.findById(id).populate("categoryId")
        const total = await BrandModel.countDocuments()

        if (brand) {
            return sendSuccess(res, brand, {
                total,
                ImageBaseUrl: "http://localhost:5000/brand/"
            })
        }

    } catch (error) {
        serverError(res)
    }
}


const deleteBrand = async (req, res) => {
    try {
        const id = req.params.id

        const brand = await BrandModel.findByIdAndDelete(id)

        // Delete brand image from public/brand/
        if (brand && brand.image) {
            deleteFile(path.join(".", "public", "brand", brand.image))
        }

        sendSuccess(res, brand)

    } catch (error) {
        return serverError(res)
    }
}

const update = async (req, res) => {
    try {

        const id = req.params.id
        const brand = await BrandModel.findById(id)

        let categories = []

        if (!brand) {
            return notFound(res)
        }

        const image = req.files?.image
        const object = {}

        if (req.body.name) {
            object.name = req.body.name
            object.slug = req.body.slug
        }
        if (req.body.categories) {
            categories = JSON.parse(req.body.categories)
            object.categoryId = categories
        }

        if (image) {
            // Delete old image before saving new one
            if (brand.image) {
                deleteFile(path.join(".", "public", "brand", brand.image))
            }
            const brandImage = imageName(image.name)
            const destination = `./public/brand/${brandImage}`
            await image.mv(destination)
            object.image = brandImage
        }

        await BrandModel.updateOne(
            { _id: brand._id },
            { $set: object }
        )

        return sendSuccess(res, "Brand Updated Successfully")

    } catch (error) {
        console.log(error)
        return serverError(res)
    }
}

module.exports = { createBrand, readBrand, deleteBrand, readById, update }