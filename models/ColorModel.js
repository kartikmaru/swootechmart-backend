const mongoose = require("mongoose")

const ColorSchema = mongoose.Schema({
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
    color_code: {
        type: String,
        unique: true,
        required: true
    },
    status: {
        type: Boolean,
        default: true
    },
    is_home: {
        type: Boolean,
        default: true
    },
    is_top: {
        type: Boolean,
        default: true
    },
    is_popular: {
        type: Boolean,
        default: true
    }
},
    {
        timestamps: true
    }
)

const ColorModel = mongoose.model("color", ColorSchema)

module.exports = ColorModel