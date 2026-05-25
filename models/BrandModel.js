const mongoose = require("mongoose")

const BrandSchema = mongoose.Schema({

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
    categoryId: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "category",
        default: []
    }
    ]
},
    {
        timestamps: true
    }
)

const BrandModel = mongoose.model("brand", BrandSchema)

module.exports = BrandModel 