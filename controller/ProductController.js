const CategoryModel = require("../models/CategoryModel")
const BrandModel    = require("../models/BrandModel")
const ProductModel  = require("../models/ProductModel")
const ColorModel    = require("../models/ColorModel")

const { uploadToCloudinary, deleteFromCloudinary } = require("../Utils/cloudinary")
const { sendSuccess, serverError, sendConflict, sendBadRequest, notFound } = require("../Utils/Response")

// ── POST /api/product ─────────────────────────────────────────────────────────
const create = async (req, res) => {
    try {
        const {
            name, slug, original_price, final_price, discount,
            category_Id, color_Id, brand_Id,
            short_description, long_description,
            stock, top_selling, status
        } = req.body

        if (!name || !slug || !original_price || !final_price || !discount ||
            !category_Id || !color_Id || !brand_Id ||
            !short_description || !long_description) {
            return sendBadRequest(res, "All required fields must be provided")
        }

        const existing = await ProductModel.findOne({ slug })
        if (existing) return sendConflict(res, "Product with this slug already exists")

        if (!req.files?.thumbnail) {
            return sendBadRequest(res, "Thumbnail image is required")
        }

        // Upload thumbnail to Cloudinary (no local disk write)
        const thumbnailUrl = await uploadToCloudinary(
            req.files.thumbnail.data,
            'swootechmart/products/thumbnails'
        )

        await ProductModel.create({
            name, slug, original_price, final_price, discount,
            category_Id,
            color_Id:         JSON.parse(color_Id),
            brand_Id,
            short_description,
            long_description,
            thumbnail:        thumbnailUrl,    // Cloudinary URL stored directly
            stock:            stock === "true",
            top_selling:      top_selling === "true",
            status:           status === "true",
        })

        return sendSuccess(res, null, {}, "Product Created Successfully")

    } catch (error) {
        console.error('[Product/create]', error.message)
        return serverError(res)
    }
}

// ── GET /api/product ──────────────────────────────────────────────────────────
const read = async (req, res) => {
    try {
        const query      = req.query
        const filter     = {}
        const sortFilter = {}
        const limit      = parseInt(query.limit) || 20
        const page       = query.page || 1
        const skip       = ((page - 1) * limit)

        if (query.id)       filter["_id"]    = query.id
        if (query.status)   filter.status    = query.status === "true"
        if (query.top_selling) filter.top_selling = query.top_selling === "true"
        if (query.stock)    filter.stock     = query.stock === "true"

        if (query.category_slug) {
            const cat = await CategoryModel.findOne({ slug: query.category_slug })
            if (cat) filter.category_Id = cat._id
        }
        if (query.brand_slug) {
            const brand = await BrandModel.findOne({ slug: query.brand_slug })
            if (brand) filter.brand_Id = brand._id
        }
        if (query.color_slug) {
            const slugs    = query.color_slug.split(",")
            const colorIds = []
            for (const s of slugs) {
                const color = await ColorModel.findOne({ slug: s.trim() })
                if (color) colorIds.push(color._id)
            }
            filter.color_Id = { $in: colorIds }
        }
        if (query.min_price && query.max_price) {
            filter.final_price = {
                $gte: parseInt(query.min_price),
                $lte: parseInt(query.max_price),
            }
        }

        if (query.sort === "asc")  sortFilter.final_price = 1
        else if (query.sort === "dsc") sortFilter.final_price = -1
        else sortFilter.createdAt = -1

        const [total, data] = await Promise.all([
            ProductModel.countDocuments(filter),
            ProductModel.find(filter)
                .sort(sortFilter).skip(skip).limit(limit)
                .populate([
                    { select: "name _id",              path: "category_Id" },
                    { select: "name _id",              path: "brand_Id" },
                    { select: "name _id color_code slug", path: "color_Id" },
                ]),
        ])

        // imageBaseUrl is empty string because thumbnails are now full Cloudinary URLs
        return sendSuccess(res, data, {
            limit, skip,
            pages: Math.ceil(total / limit),
            total,
            imageBaseUrl: "",   // Cloudinary URLs are absolute — no base URL needed
        })
    } catch (error) {
        console.error('[Product/read]', error.message)
        return serverError(res)
    }
}

// ── GET /api/product/:id ──────────────────────────────────────────────────────
const readById = async (req, res) => {
    try {
        const product = await ProductModel.findById(req.params.id)
            .populate([
                { select: "name _id",                 path: "category_Id" },
                { select: "name _id",                 path: "brand_Id" },
                { select: "name _id color_code slug", path: "color_Id" },
            ])

        if (!product) return notFound(res, "Product not found")

        return sendSuccess(res, product, {
            imageBaseUrl: "",   // Cloudinary URLs are absolute
        })
    } catch (error) {
        console.error('[Product/readById]', error.message)
        return serverError(res)
    }
}

// ── POST /api/product/:id/images ─────────────────────────────────────────────
const upload_image = async (req, res) => {
    try {
        const product = await ProductModel.findById(req.params.id)
        if (!product) return notFound(res, "Product Not Found")

        if (!req.files?.images) return sendBadRequest(res, "No images provided")

        const files  = Array.isArray(req.files.images) ? req.files.images : [req.files.images]
        const urls   = []

        for (const file of files) {
            const url = await uploadToCloudinary(file.data, 'swootechmart/products/gallery')
            urls.push(url)
        }

        product.images.push(...urls)
        await product.save()

        return sendSuccess(res, product, {}, "Images Added Successfully")
    } catch (error) {
        console.error('[Product/upload_image]', error.message)
        return serverError(res)
    }
}

// ── DELETE /api/product/:id/images ───────────────────────────────────────────
const delete_image = async (req, res) => {
    try {
        const { id }         = req.params
        const { image_name } = req.body   // now this is the full Cloudinary URL

        const product = await ProductModel.findById(id)
        if (!product) return notFound(res, "Product Does Not Exist")

        // Remove from DB
        await ProductModel.findByIdAndUpdate(id, {
            $pull: { images: image_name }
        })

        // Delete from Cloudinary (non-critical)
        await deleteFromCloudinary(image_name)

        return sendSuccess(res, "Image deleted successfully")
    } catch (error) {
        console.error('[Product/delete_image]', error.message)
        return serverError(res)
    }
}

// ── PATCH /api/product/:id/toggle ────────────────────────────────────────────
// Toggle boolean fields: top_selling, stock, status
const updateProduct = async (req, res) => {
    try {
        const { field } = req.body
        const allowed   = ["top_selling", "stock", "status"]

        if (!allowed.includes(field)) return sendBadRequest(res, "Invalid field")

        const product = await ProductModel.findById(req.params.id)
        if (!product) return notFound(res)

        await ProductModel.findByIdAndUpdate(req.params.id, {
            [field]: !product[field]
        })

        return res.status(202).json({
            success: true,
            msg:     "Field updated",
            data:    product,
        })
    } catch (error) {
        return serverError(res)
    }
}

// ── PUT /api/product/:id ──────────────────────────────────────────────────────
const update = async (req, res) => {
    try {
        const product = await ProductModel.findById(req.params.id)
        if (!product) return notFound(res)

        const obj = {}
        const b   = req.body

        if (b.name)              obj.name              = b.name
        if (b.slug)              obj.slug              = b.slug
        if (b.original_price)    obj.original_price    = b.original_price
        if (b.final_price)       obj.final_price       = b.final_price
        if (b.discount)          obj.discount          = b.discount
        if (b.short_description) obj.short_description = b.short_description
        if (b.long_description)  obj.long_description  = b.long_description
        if (b.category_Id)       obj.category_Id       = b.category_Id
        if (b.brand_Id)          obj.brand_Id          = b.brand_Id
        if (b.color_Id)          obj.color_Id          = JSON.parse(b.color_Id)
        if (b.stock       !== undefined) obj.stock       = b.stock       === "true"
        if (b.top_selling !== undefined) obj.top_selling = b.top_selling === "true"
        if (b.status      !== undefined) obj.status      = b.status      === "true"

        if (req.files?.thumbnail) {
            // Upload new thumbnail to Cloudinary
            const newUrl = await uploadToCloudinary(
                req.files.thumbnail.data,
                'swootechmart/products/thumbnails'
            )
            // Delete old thumbnail from Cloudinary (non-critical)
            if (product.thumbnail) {
                await deleteFromCloudinary(product.thumbnail)
            }
            obj.thumbnail = newUrl
        }

        await ProductModel.updateOne({ _id: req.params.id }, { $set: obj })
        return sendSuccess(res, null, {}, "Product Updated Successfully")

    } catch (error) {
        console.error('[Product/update]', error.message)
        return serverError(res)
    }
}

// ── DELETE /api/product/:id ───────────────────────────────────────────────────
const deleteProduct = async (req, res) => {
    try {
        const product = await ProductModel.findByIdAndDelete(req.params.id)

        if (product) {
            // Delete Cloudinary images (non-critical — don't block response)
            const deletePromises = []

            if (product.thumbnail) {
                deletePromises.push(deleteFromCloudinary(product.thumbnail))
            }
            if (product.images?.length > 0) {
                product.images.forEach(url => deletePromises.push(deleteFromCloudinary(url)))
            }

            Promise.allSettled(deletePromises).then(results => {
                const failed = results.filter(r => r.status === 'rejected')
                if (failed.length > 0) {
                    console.warn('[Product/delete] Some Cloudinary deletes failed:', failed.length)
                }
            })
        }

        return sendSuccess(res, null, {}, "Product Deleted Successfully")
    } catch (error) {
        console.error('[Product/deleteProduct]', error.message)
        return serverError(res)
    }
}

module.exports = {
    create, read, readById,
    upload_image, delete_image,
    updateProduct, update,
    deleteProduct,
}
