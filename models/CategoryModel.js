const mongoose = require("mongoose")


const CategorySchema = mongoose.Schema({
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
    image: {
        type: String,
        default: null
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
    },
},
{
    timestamps:true
}
)

const CategoryModel = mongoose.model("category", CategorySchema)

module.exports = CategoryModel