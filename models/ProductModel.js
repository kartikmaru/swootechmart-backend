const mongoose = require("mongoose")

const ProductSchema = mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    slug: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    short_description: {
        type: String,
    },
    long_description: {
        type: String
    },
    original_price: {
        type: Number,
        required: true
    },
    discount: {
        type: Number,
        default: 5
    },
    final_price: {
        type: Number,
        required: true
    },
    category_Id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "category",
    },
    brand_Id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "brand",
    },
    color_Id: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "color"
    }],
    thumbnail: {
        type: String,
        default: null
    },
    images: [
        {
            type: String,
            default: null
        }
    ],
    stock: {
        type: Boolean,
        default: false
    },
    top_selling: {
        type: Boolean,
        default: false
    },
    status: {
        type: Boolean,
        default: true
    }
},
    {
        timestamps: true
    }
)

const ProductModel = mongoose.model("product", ProductSchema)

module.exports = ProductModel