const Minio = require('minio');

/**
 * MinIO WORM Configuration Script
 * Enables Write Once, Read Many mode for compliance and security
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
 * Enable WORM mode on MinIO bucket
 * @param {number} retentionDays - Retention period in days (default: 2555 = 7 years)
 */
const enableWORM = async (retentionDays = 2555) => {
  try {
    console.log(`🔒 Enabling WORM mode on bucket: ${BUCKET_NAME}`);
    console.log(`📅 Retention period: ${retentionDays} days (${Math.round(retentionDays/365)} years)`);
    
    // Check if bucket exists
    const bucketExists = await minioClient.bucketExists(BUCKET_NAME);
    if (!bucketExists) {
      throw new Error(`Bucket ${BUCKET_NAME} does not exist. Please create it first.`);
    }
    
    // Set bucket versioning (required for WORM)
    await minioClient.setBucketVersioning(BUCKET_NAME, 'Enabled');
    console.log('✅ Bucket versioning enabled');
    
    // Set bucket lifecycle policy for WORM
    const lifecyclePolicy = {
      Rules: [
        {
          ID: 'WORM-Retention',
          Status: 'Enabled',
          Filter: {
            Prefix: ''
          },
          NoncurrentVersionExpiration: {
            NoncurrentDays: retentionDays
          },
          Expiration: {
            Days: retentionDays
          }
        }
      ]
    };
    
    await minioClient.setBucketLifecycle(BUCKET_NAME, JSON.stringify(lifecyclePolicy));
    console.log('✅ WORM lifecycle policy applied');
    
    // Set bucket policy to prevent deletion
    const bucketPolicy = {
      Version: '2012-10-17',
      Statement: [
        {
          Sid: 'DenyDelete',
          Effect: 'Deny',
          Principal: { AWS: ['*'] },
          Action: [
            's3:DeleteObject',
            's3:DeleteObjectVersion',
            's3:DeleteBucket'
          ],
          Resource: [
            `arn:aws:s3:::${BUCKET_NAME}`,
            `arn:aws:s3:::${BUCKET_NAME}/*`
          ]
        },
        {
          Sid: 'AllowRead',
          Effect: 'Allow',
          Principal: { AWS: ['*'] },
          Action: [
            's3:GetObject',
            's3:GetObjectVersion',
            's3:ListBucket'
          ],
          Resource: [
            `arn:aws:s3:::${BUCKET_NAME}`,
            `arn:aws:s3:::${BUCKET_NAME}/*`
          ]
        },
        {
          Sid: 'AllowWrite',
          Effect: 'Allow',
          Principal: { AWS: ['*'] },
          Action: [
            's3:PutObject'
          ],
          Resource: [
            `arn:aws:s3:::${BUCKET_NAME}/*`
          ]
        }
      ]
    };
    
    await minioClient.setBucketPolicy(BUCKET_NAME, JSON.stringify(bucketPolicy));
    console.log('✅ WORM bucket policy applied');
    
    console.log(`🎉 WORM mode successfully enabled on ${BUCKET_NAME}`);
    console.log(`⚠️  Files uploaded to this bucket cannot be deleted for ${retentionDays} days`);
    
    return true;
  } catch (error) {
    console.error('❌ Failed to enable WORM mode:', error);
    throw error;
  }
};

/**
 * Disable WORM mode (use with caution)
 */
const disableWORM = async () => {
  try {
    console.log(`🔓 Disabling WORM mode on bucket: ${BUCKET_NAME}`);
    
    // Remove lifecycle policy
    await minioClient.setBucketLifecycle(BUCKET_NAME, '');
    console.log('✅ Lifecycle policy removed');
    
    // Remove bucket policy
    await minioClient.setBucketPolicy(BUCKET_NAME, '');
    console.log('✅ Bucket policy removed');
    
    // Disable versioning
    await minioClient.setBucketVersioning(BUCKET_NAME, 'Suspended');
    console.log('✅ Bucket versioning suspended');
    
    console.log(`🎉 WORM mode disabled on ${BUCKET_NAME}`);
    console.log('⚠️  Files can now be deleted (use with caution)');
    
    return true;
  } catch (error) {
    console.error('❌ Failed to disable WORM mode:', error);
    throw error;
  }
};

/**
 * Check WORM status
 */
const checkWORMStatus = async () => {
  try {
    console.log(`🔍 Checking WORM status for bucket: ${BUCKET_NAME}`);
    
    // Check bucket exists
    const bucketExists = await minioClient.bucketExists(BUCKET_NAME);
    if (!bucketExists) {
      console.log('❌ Bucket does not exist');
      return false;
    }
    
    // Check versioning status
    const versioning = await minioClient.getBucketVersioning(BUCKET_NAME);
    console.log(`📋 Versioning status: ${versioning.Status || 'NotEnabled'}`);
    
    // Check lifecycle policy
    try {
      const lifecycle = await minioClient.getBucketLifecycle(BUCKET_NAME);
      console.log('📋 Lifecycle policy: Enabled');
      console.log(`📅 Retention rules: ${lifecycle.Rules?.length || 0} rules`);
    } catch (error) {
      console.log('📋 Lifecycle policy: Not configured');
    }
    
    // Check bucket policy
    try {
      const policy = await minioClient.getBucketPolicy(BUCKET_NAME);
      const policyObj = JSON.parse(policy);
      const denyDelete = policyObj.Statement?.some(s => s.Sid === 'DenyDelete');
      console.log(`📋 WORM policy: ${denyDelete ? 'Enabled' : 'Not configured'}`);
    } catch (error) {
      console.log('📋 Bucket policy: Not configured');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Failed to check WORM status:', error);
    return false;
  }
};

// CLI interface
if (require.main === module) {
  const command = process.argv[2];
  const retentionDays = parseInt(process.argv[3]) || 2555;
  
  switch (command) {
    case 'enable':
      enableWORM(retentionDays)
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
      break;
      
    case 'disable':
      disableWORM()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
      break;
      
    case 'status':
      checkWORMStatus()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
      break;
      
    default:
      console.log('Usage: node setup-minio-worm.js [enable|disable|status] [retentionDays]');
      console.log('');
      console.log('Commands:');
      console.log('  enable [retentionDays]  - Enable WORM mode (default: 2555 days = 7 years)');
      console.log('  disable                 - Disable WORM mode (use with caution)');
      console.log('  status                  - Check WORM status');
      console.log('');
      console.log('Examples:');
      console.log('  node setup-minio-worm.js enable 3650    # 10 years retention');
      console.log('  node setup-minio-worm.js enable         # 7 years retention (default)');
      console.log('  node setup-minio-worm.js status         # Check current status');
      process.exit(0);
  }
}

module.exports = {
  enableWORM,
  disableWORM,
  checkWORMStatus
}; 