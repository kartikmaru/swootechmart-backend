// cloudinary.js — Cloudinary configuration aur upload utility
// express-fileupload se buffer milta hai, use Cloudinary par directly upload karo
// No local disk write — Render ke ephemeral filesystem ki problem solve ho jaati hai

const cloudinary = require('cloudinary').v2

// Cloudinary credentials configure karo
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
})

/**
 * Upload a file buffer to Cloudinary
 * @param {Buffer} buffer   - File buffer from express-fileupload (file.data)
 * @param {string} folder   - Cloudinary folder name e.g. 'swootechmart/products'
 * @returns {Promise<string>} - Cloudinary secure URL
 */
function uploadToCloudinary(buffer, folder = 'swootechmart/products') {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder,
                resource_type: 'image',
                // Automatically optimize format and quality
                fetch_format:  'auto',
                quality:       'auto',
            },
            (error, result) => {
                if (error) {
                    console.error('[Cloudinary] Upload error:', error.message)
                    reject(error)
                } else {
                    resolve(result.secure_url)
                }
            }
        )
        uploadStream.end(buffer)
    })
}

/**
 * Delete an image from Cloudinary by its public_id or full URL
 * @param {string} urlOrPublicId - Full Cloudinary URL or public_id
 */
async function deleteFromCloudinary(urlOrPublicId) {
    try {
        // Extract public_id from URL if full URL is passed
        // URL format: https://res.cloudinary.com/{cloud}/image/upload/v{version}/{folder}/{public_id}.{ext}
        let publicId = urlOrPublicId

        if (urlOrPublicId.startsWith('http')) {
            // Parse the public_id from the URL
            const parts = urlOrPublicId.split('/')
            const uploadIndex = parts.indexOf('upload')
            if (uploadIndex !== -1) {
                // Everything after /upload/v{version}/ is the public_id (without extension)
                const withVersion = parts.slice(uploadIndex + 1).join('/')
                const withoutVersion = withVersion.replace(/^v\d+\//, '')
                publicId = withoutVersion.replace(/\.[^.]+$/, '') // remove extension
            }
        }

        await cloudinary.uploader.destroy(publicId)
        console.log('[Cloudinary] Deleted:', publicId)
    } catch (err) {
        // Non-critical — log but don't throw
        console.warn('[Cloudinary] Delete failed (non-critical):', err.message)
    }
}

module.exports = { uploadToCloudinary, deleteFromCloudinary }
