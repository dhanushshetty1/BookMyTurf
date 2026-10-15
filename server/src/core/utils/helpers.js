/**
 * Parses an array field that might come as a comma-separated string or an array.
 * @param {string|string[]|undefined} field 
 * @returns {string[]}
 */
export const parseArrayField = (field) => {
  if (!field) return [];
  return Array.isArray(field) ? field : field.split(',');
};

/**
 * Extracts and processes images from req.files, existing images, and URL arrays,
 * ensuring that the cover image is always at index 0.
 * 
 * @param {Object} options
 * @param {Array} options.reqFiles - Array of uploaded files from multer
 * @param {string|string[]} options.existingImages - Images already associated
 * @param {string|string[]} options.imageUrls - New image URLs passed as strings
 * @param {string} options.coverIdentifier - The identifier for the cover image
 * @returns {string[]} The fully processed array of image URLs
 */
export const extractImages = ({
  reqFiles = [],
  existingImages = [],
  imageUrls = [],
  coverIdentifier = null
}) => {
  let images = [];
  let coverPath = null;

  // 1. Process uploaded files
  if (reqFiles && reqFiles.length > 0) {
    reqFiles.forEach(file => {
      const url = `/uploads/${file.filename}`;
      if (coverIdentifier === file.originalname) {
        coverPath = url;
      } else {
        images.push(url);
      }
    });
  }

  // 2. Process existing images
  if (existingImages) {
    const existingArray = Array.isArray(existingImages) ? existingImages : [existingImages];
    images.push(...existingArray);
  }

  // 3. Process image URLs
  if (imageUrls) {
    const urlArray = Array.isArray(imageUrls) ? imageUrls : [imageUrls];
    images.push(...urlArray);
  }

  // 4. Ensure cover image logic is applied correctly to existing/url images
  if (coverIdentifier && !coverPath) {
    const coverIdx = images.findIndex(img => img === coverIdentifier || img.endsWith(coverIdentifier));
    if (coverIdx > -1) {
      const [cover] = images.splice(coverIdx, 1);
      coverPath = cover;
    }
  }

  // 5. Unshift cover path if found
  if (coverPath) {
    images.unshift(coverPath);
  }

  return images;
};
