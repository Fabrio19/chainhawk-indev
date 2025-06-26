const Minio = require('minio');
const { Readable } = require('stream');

/**
 * MinIO Service for secure file storage
 * Handles KYC documents and evidence files with S3-compatible storage
 */

// MinIO client configuration
const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: parseInt(process.env.MINIO_PORT) || 9000,
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY || 'admin',
  secretKey: process.env.MINIO_SECRET_KEY || 'password123'
});

const BUCKET_NAME = process.env.MINIO_BUCKET || 'kyc-evidence';

/**
 * Initialize MinIO bucket and policies
 */
const initializeMinIO = async () => {
  try {
    // Check if bucket exists
    const bucketExists = await minioClient.bucketExists(BUCKET_NAME);
    
    if (!bucketExists) {
      // Create bucket
      await minioClient.makeBucket(BUCKET_NAME, 'us-east-1');
      console.log(`✅ Created MinIO bucket: ${BUCKET_NAME}`);
      
      // Set bucket policy for read-only access (optional)
      const policy = {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: { AWS: ['*'] },
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${BUCKET_NAME}/*`]
          }
        ]
      };
      
      await minioClient.setBucketPolicy(BUCKET_NAME, JSON.stringify(policy));
      console.log(`✅ Set bucket policy for ${BUCKET_NAME}`);
    } else {
      console.log(`✅ MinIO bucket ${BUCKET_NAME} already exists`);
    }
    
    return true;
  } catch (error) {
    console.error('❌ MinIO initialization failed:', error);
    throw error;
  }
};

/**
 * Upload file to MinIO
 * @param {Buffer} fileBuffer - File buffer
 * @param {string} fileName - Original file name
 * @param {string} fileType - File type (KYC, Screenshot, etc.)
 * @param {string} caseId - Case ID for organization
 * @returns {Promise<Object>} Upload result with object key and metadata
 */
const uploadFile = async (fileBuffer, fileName, fileType, caseId) => {
  try {
    // Generate unique object key
    const timestamp = Date.now();
    const fileExtension = fileName.split('.').pop();
    const objectKey = `${caseId}/${fileType.toLowerCase()}/${timestamp}-${fileName}`;
    
    // Upload to MinIO
    await minioClient.putObject(
      BUCKET_NAME,
      objectKey,
      fileBuffer,
      fileBuffer.length,
      {
        'Content-Type': getContentType(fileExtension),
        'x-amz-meta-case-id': caseId,
        'x-amz-meta-file-type': fileType,
        'x-amz-meta-original-name': fileName,
        'x-amz-meta-uploaded-at': new Date().toISOString()
      }
    );
    
    console.log(`✅ File uploaded to MinIO: ${objectKey}`);
    
    return {
      objectKey,
      bucketName: BUCKET_NAME,
      fileName,
      fileType,
      size: fileBuffer.length,
      uploadedAt: new Date()
    };
  } catch (error) {
    console.error('❌ MinIO upload failed:', error);
    throw new Error(`File upload failed: ${error.message}`);
  }
};

/**
 * Download file from MinIO
 * @param {string} objectKey - MinIO object key
 * @returns {Promise<Readable>} File stream
 */
const downloadFile = async (objectKey) => {
  try {
    const stream = await minioClient.getObject(BUCKET_NAME, objectKey);
    return stream;
  } catch (error) {
    console.error('❌ MinIO download failed:', error);
    throw new Error(`File download failed: ${error.message}`);
  }
};

/**
 * Get file metadata from MinIO
 * @param {string} objectKey - MinIO object key
 * @returns {Promise<Object>} File metadata
 */
const getFileMetadata = async (objectKey) => {
  try {
    const stat = await minioClient.statObject(BUCKET_NAME, objectKey);
    return {
      size: stat.size,
      lastModified: stat.lastModified,
      etag: stat.etag,
      contentType: stat.metaData['content-type'],
      caseId: stat.metaData['x-amz-meta-case-id'],
      fileType: stat.metaData['x-amz-meta-file-type'],
      originalName: stat.metaData['x-amz-meta-original-name'],
      uploadedAt: stat.metaData['x-amz-meta-uploaded-at']
    };
  } catch (error) {
    console.error('❌ MinIO metadata fetch failed:', error);
    throw new Error(`File metadata fetch failed: ${error.message}`);
  }
};

/**
 * Delete file from MinIO
 * @param {string} objectKey - MinIO object key
 * @returns {Promise<boolean>} Success status
 */
const deleteFile = async (objectKey) => {
  try {
    await minioClient.removeObject(BUCKET_NAME, objectKey);
    console.log(`✅ File deleted from MinIO: ${objectKey}`);
    return true;
  } catch (error) {
    console.error('❌ MinIO delete failed:', error);
    throw new Error(`File deletion failed: ${error.message}`);
  }
};

/**
 * List files for a case
 * @param {string} caseId - Case ID
 * @returns {Promise<Array>} List of files
 */
const listCaseFiles = async (caseId) => {
  try {
    const files = [];
    const stream = minioClient.listObjects(BUCKET_NAME, `${caseId}/`, true);
    
    return new Promise((resolve, reject) => {
      stream.on('data', (obj) => {
        files.push({
          objectKey: obj.name,
          size: obj.size,
          lastModified: obj.lastModified
        });
      });
      
      stream.on('end', () => {
        resolve(files);
      });
      
      stream.on('error', (error) => {
        reject(error);
      });
    });
  } catch (error) {
    console.error('❌ MinIO list files failed:', error);
    throw new Error(`File listing failed: ${error.message}`);
  }
};

/**
 * Get content type based on file extension
 * @param {string} extension - File extension
 * @returns {string} MIME type
 */
const getContentType = (extension) => {
  const contentTypes = {
    'pdf': 'application/pdf',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'txt': 'text/plain'
  };
  
  return contentTypes[extension.toLowerCase()] || 'application/octet-stream';
};

/**
 * Generate presigned URL for temporary access
 * @param {string} objectKey - MinIO object key
 * @param {number} expirySeconds - URL expiry time in seconds (default: 3600)
 * @returns {Promise<string>} Presigned URL
 */
const generatePresignedUrl = async (objectKey, expirySeconds = 3600) => {
  try {
    const url = await minioClient.presignedGetObject(BUCKET_NAME, objectKey, expirySeconds);
    return url;
  } catch (error) {
    console.error('❌ Presigned URL generation failed:', error);
    throw new Error(`Presigned URL generation failed: ${error.message}`);
  }
};

module.exports = {
  initializeMinIO,
  uploadFile,
  downloadFile,
  getFileMetadata,
  deleteFile,
  listCaseFiles,
  generatePresignedUrl,
  minioClient,
  BUCKET_NAME
}; 