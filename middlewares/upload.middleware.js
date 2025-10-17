const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Ensure uploads folder exists
const baseUploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(baseUploadDir)) {
  fs.mkdirSync(baseUploadDir, { recursive: true });
}


const upload = (folderName = "") => {
  // Make sure folder exists
  const uploadDir = path.join(baseUploadDir, folderName);
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  // Storage config
  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
      const uniqueName = `${Date.now()}-${Math.round(
        Math.random() * 1e9
      )}${path.extname(file.originalname)}`;
      cb(null, uniqueName);
    },
  });

  return multer({ storage });
};

module.exports = upload;
