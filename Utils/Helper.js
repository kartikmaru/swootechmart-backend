function imageName(image) {
    return Date.now() + Math.floor(Math.random() * 10000) + image
}

module.exports = imageName 