import { Upload } from "@aws-sdk/lib-storage";
import s3Client from "./s3Config.js";
import crypto from "crypto";

/**
 * Uploads a file to AWS S3
 * @param {Buffer} fileBuffer - The file content
 * @param {string} fileName - Original filename
 * @param {string} mimeType - Mime type of the file
 * @param {string} folder - Folder prefix (default: 'ads')
 * @returns {Promise<string>} - The public URL of the uploaded image
 */
export const uploadFileToS3 = async (fileBuffer, fileName, mimeType, folder = 'ads') => {
    const fileExtension = fileName.split('.').pop();
    const uniqueFileName = `${crypto.randomBytes(16).toString('hex')}.${fileExtension}`;
    const bucketName = process.env.AWS_BUCKET_NAME;

    const parallelUploads3 = new Upload({
        client: s3Client,
        params: {
            Bucket: bucketName,
            Key: `${folder}/${uniqueFileName}`,
            Body: fileBuffer,
            ContentType: mimeType,
            // ACL: 'public-read' // Uncomment if bucket permissions require this, though usually handled by bucket policy
        },
        queueSize: 4,
        partSize: 1024 * 1024 * 5, // 5MB
        leavePartsOnError: false,
    });

    await parallelUploads3.done();

    const region = process.env.AWS_REGION;
    return `https://${bucketName}.s3.${region}.amazonaws.com/${folder}/${uniqueFileName}`;
};
