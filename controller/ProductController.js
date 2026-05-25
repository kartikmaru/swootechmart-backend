const CategoryModel = require("../models/CategoryModel")
const BrandModel = require("../models/BrandModel")
const ProductModel = require("../models/ProductModel")
const ColorModel = require("../models/ColorModel")
const imageName = require("../Utils/Helper")
const { sendSuccess, serverError, sendConflict, sendBadRequest, notFound } = require("../Utils/Response")
const fs = require("fs")



const create = async (req, res) => {
    try {
        const { name, slug, original_price, final_price, discount, category_Id, color_Id, brand_Id, short_description, long_description, stock, top_selling, status } = req.body

        console.log(req.body)
        // console.log({
        //     stock,
        //     top_selling,
        //     status
        // })

        const thumbnail = req.files.thumbnail

        if (!name || !slug || !original_price || !final_price || !discount || !category_Id || !color_Id || !brand_Id || !short_description || !long_description) return sendBadRequest(res)

        const product = await ProductModel.findOne({ slug })
        if (product) return sendConflict(res)

        console.log({
            stock: stock === "true",
            top_selling: top_selling === "true",
            status: status === "true"
        })

        const img_name = imageName(thumbnail.name)

        const destination = `./public/product/${img_name}`

        thumbnail.mv(destination, async (err) => {
            if (err) {
                return serverError(res, "Unable to load image")
            }
            await ProductModel.create({
                name, slug, original_price, final_price, discount, category_Id, color_Id: JSON.parse(color_Id), brand_Id, short_description, long_description, thumbnail: img_name,
                stock: stock === "true",
                top_selling: top_selling === "true",
                status: status === "true"
            })
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
        const sortFilter = {}
        const limit = parseInt(query.limit)
        const page = query.page || 1
        const skip = ((page - 1) * limit)
        if (query.category_slug) {
            const category = await CategoryModel.findOne({ slug: query.category_slug })
            filter.category_Id = category._id
        }

        if (query.id) filter["_id"] = query.id

        if (query.status) {
            filter.status = query.status === "true"
        }

        if (query.top_selling) {
            filter.top_selling = query.top_selling === "true"
        }

        if (query.stock) {
            filter.stock = query.stock === "true"
        }
        if (query.category_slug) {
            const category = await CategoryModel.findOne({ slug: query.category_slug })
            filter.category_Id = category._id
        }
        if (query.brand_slug) {
            const brand = await BrandModel.findOne({ slug: query.brand_slug })
            filter.brand_Id = brand._id
        }
        if (query.color_slug) {

            const color_slugs = query.color_slug.split(",")
            const color_ids = []

            for (let slug of color_slugs) {
                const color = await ColorModel.findOne({ slug: slug.trim() });
                if (color) {
                    color_ids.push(color._id);
                }
            }

            filter.color_Id = { $in: color_ids };

        }

        if (query.min_price && query.max_price) {
            filter.final_price = {
                $gte: parseInt(query.min_price),
                $lte: parseInt(query.max_price)
            }
        }

        if (query.sort) {
            if (query.sort == "asc") {
                sortFilter.final_price = 1
            }
            else if (query.sort == "dsc") {
                sortFilter.final_price = -1
            }
            else {
                sortFilter.createdAt = -1
            }
        }


        const [total, data] = await Promise.all([
            await ProductModel.countDocuments(filter),
            ProductModel.find(filter).sort(sortFilter).skip(skip).limit(limit)
                .populate([
                    {
                        select: "name _id",
                        path: "category_Id"
                    },
                    {
                        select: "name _id",
                        path: "brand_Id"
                    },
                    {
                        select: "name _id",
                        path: "color_Id"
                    },
                ])
        ])

        return sendSuccess(res, data, {
            limit,
            skip,
            pages: Math.ceil(total / limit),
            total: total,
            imageBaseUrl: "http://localhost:5000/product/"
        })
    } catch (error) {
        return serverError(res)
    }
}

const upload_image = async (req, res) => {
    try {
        const { id } = req.params
        const product = await ProductModel.findById(id)
        if (!product) return notFound(res, "Product Not Found")
        if (!req.files || !req.files.images) return sendBadRequest(res, "images Not Exist")
        const images = Array.isArray(req.files.images) ? req.files.images : [req.files.images]
        const image_names = []
        for (let image of images) {
            const img_name = imageName(image.name)
            const destination = `./public/product/other/${img_name}`
            await image.mv(destination)
            image_names.push(img_name)
        }
        product.images.push(...image_names)
        await product.save()
        return sendSuccess(res, product, "images Added Successfully",)
    } catch (error) {
        console.log(error)
        return serverError(res)
    }


}

const delete_image = async (req, res) => {
    try {
        const { id } = req.params
        const { image_name } = req.body

        const product = await ProductModel.findById(id)
        if (!product) {
            return notFound(res, "Product Does Not Exist")
        }

        await ProductModel.findByIdAndUpdate(id, {
            $pull: { images: image_name }
        })

        fs.unlink(`./public/product/other/${image_name}`, (err) => {
            if (err) console.log("Unable to delete image", err)
        })

        return sendSuccess(res, "Image successfully deleted")

    } catch (error) {
        return serverError(res)
    }
}

const readById = async (req, res) => {
    try {
        const id = req.params.id
        const total = await ProductModel.countDocuments()
        const meta = {
            total,
            imageBaseUrl: "http://localhost:5000/product/other/"
        }
        const product = await ProductModel.findById(id)
            .populate([
                {
                    select: "name _id",
                    path: "category_Id"
                },
                {
                    select: "name _id",
                    path: "brand_Id"
                },
                {
                    select: "name _id",
                    path: "color_Id"
                },
            ])
        if (product) {
            return sendSuccess(res, product, meta)
        }
    } catch (error) {
        return serverError(res)
    }
}


const updateProduct = async (req, res) => {
    try {
        const { field } = req.body
        const id = req.params.id
        const fields = ["top_selling", "stock", "status"]
        const product = await ProductModel.findById(id)
        if (!product) {
            return notFound(res)
        }

        if (!fields.includes(field)) return sendBadRequest(res)

        await ProductModel.findByIdAndUpdate(id, {
            [field]: !product[field]
        })

        res.status(202).json({
            msg: "Student Status Updated",
            success: true,
            data: product
        })

    } catch (error) {
        return serverError(res)
    }
}


const deleteProduct = async (req, res) => {
    try {
        const id = req.params.id

        const product = await ProductModel.findByIdAndDelete(id)

        sendSuccess(res)

    } catch (error) {
        return serverError(res)
    }
}

// update Category API

// const update = async (req, res) => {
//     try {
//         const image = req.files?.image || null
//         const id = req.params.id

//         const category = await CategoryModel.findById(id)
//         if (!category) {
//             return notFound(res)
//         }

//         const object = {}

//         if (req.body.name) {
//             object.name = req.body.name;
//             object.slug = req.body.slug;
//         }

//         if (image) {
//             const category_image = imageName(image.name)
//             const destination = `./public/category/${category_image}`

//             await image.mv(destination)
//             object.image = category_image
//         }

//         await CategoryModel.updateOne(
//             { _id: category._id },
//             { $set: object }
//         )


//         sendSuccess(res)
//     } catch (error) {
//         console.log(error)
//         return serverError(res)
//     }
// }

module.exports = { create, read, upload_image, updateProduct, readById, delete_image, deleteProduct }