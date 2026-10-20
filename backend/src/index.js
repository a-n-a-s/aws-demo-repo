import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import os from 'os';
import {
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { s3, BUCKET_NAME } from './s3.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Multer memory storage for product image uploads (5MB max)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }
});

app.use(cors());
app.use(express.json());

// In-memory products store (simple & clean, perfect for live demos without requiring DB setup!)
let products = [
  {
    id: 'prod-1',
    name: 'Wireless Noise-Canceling Headphones',
    price: 199.99,
    category: 'Electronics',
    description: 'Premium over-ear headphones with active noise cancellation and 30-hour battery life.',
    imageKey: '',
    imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&q=80',
    createdAt: new Date().toISOString()
  },
  {
    id: 'prod-2',
    name: 'Minimalist Mechanical Keyboard',
    price: 89.50,
    category: 'Accessories',
    description: 'Hot-swappable tactile mechanical keyboard with RGB backlighting.',
    imageKey: '',
    imageUrl: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=500&q=80',
    createdAt: new Date().toISOString()
  }
];

// -------------------------------------------------------------
// Route 1: EC2 Server Health & Deployment Info
// Used in the header to show the EC2 host details during your live demo
// -------------------------------------------------------------
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    server: {
      hostname: os.hostname(),
      platform: os.platform(),
      arch: os.arch(),
      uptimeSeconds: Math.floor(os.uptime()),
      freeMemoryMB: Math.round(os.freemem() / (1024 * 1024)),
      totalMemoryMB: Math.round(os.totalmem() / (1024 * 1024)),
      nodeVersion: process.version
    },
    s3Configured: Boolean(BUCKET_NAME),
    bucket: BUCKET_NAME || 'Not Configured'
  });
});

// -------------------------------------------------------------
// Route 2: Get all products (with refreshed S3 pre-signed URLs)
// -------------------------------------------------------------
app.get('/api/products', async (req, res) => {
  try {
    // If a product has an imageKey in S3, dynamically generate a temporary pre-signed URL
    const productsWithUrls = await Promise.all(
      products.map(async (prod) => {
        if (prod.imageKey && BUCKET_NAME) {
          try {
            const command = new GetObjectCommand({
              Bucket: BUCKET_NAME,
              Key: prod.imageKey
            });
            const signedUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });
            return { ...prod, imageUrl: signedUrl };
          } catch (err) {
            console.error(`Failed to sign URL for ${prod.imageKey}:`, err.message);
            return prod;
          }
        }
        return prod;
      })
    );

    res.json({
      count: productsWithUrls.length,
      products: productsWithUrls
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to retrieve products' });
  }
});

// -------------------------------------------------------------
// Route 3: Get a single product by ID
// -------------------------------------------------------------
app.get('/api/products/:id', async (req, res) => {
  const product = products.find(p => p.id === req.params.id);
  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }

  let finalProduct = { ...product };
  if (product.imageKey && BUCKET_NAME) {
    try {
      const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: product.imageKey
      });
      finalProduct.imageUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });
    } catch (err) {
      console.error(err);
    }
  }

  res.json(finalProduct);
});

// -------------------------------------------------------------
// Route 4: Create a new product with an Image uploaded to S3
// -------------------------------------------------------------
app.post('/api/products', upload.single('image'), async (req, res) => {
  try {
    const { name, price, category, description } = req.body;

    if (!name || !price) {
      return res.status(400).json({ error: 'Product name and price are required' });
    }

    let imageKey = '';
    let fallbackImageUrl = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&q=80';

    // If an image file was provided and S3 bucket is configured, upload to S3!
    if (req.file) {
      if (!BUCKET_NAME) {
        return res.status(400).json({
          error: 'AWS_S3_BUCKET is not configured in backend/.env. Please configure your bucket name.'
        });
      }

      const fileExtension = req.file.originalname.split('.').pop() || 'jpg';
      imageKey = `products/${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExtension}`;

      const putCommand = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: imageKey,
        Body: req.file.buffer,
        ContentType: req.file.mimetype
      });

      await s3.send(putCommand);
    }

    const newProduct = {
      id: `prod-${Date.now()}`,
      name: name.trim(),
      price: parseFloat(price),
      category: category ? category.trim() : 'General',
      description: description ? description.trim() : '',
      imageKey,
      imageUrl: fallbackImageUrl,
      createdAt: new Date().toISOString()
    };

    // If it was uploaded to S3, generate immediate pre-signed URL for response
    if (imageKey) {
      const getCommand = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: imageKey
      });
      newProduct.imageUrl = await getSignedUrl(s3, getCommand, { expiresIn: 3600 });
    }

    products.unshift(newProduct);

    res.status(201).json({
      message: 'Product created successfully',
      product: newProduct
    });
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ error: error.message || 'Failed to create product' });
  }
});

// -------------------------------------------------------------
// Route 5: Delete a product (and delete its image from S3)
// -------------------------------------------------------------
app.delete('/api/products/:id', async (req, res) => {
  try {
    const productIndex = products.findIndex(p => p.id === req.params.id);
    if (productIndex === -1) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const product = products[productIndex];

    // Delete image from S3 if it exists in the bucket
    if (product.imageKey && BUCKET_NAME) {
      try {
        const deleteCommand = new DeleteObjectCommand({
          Bucket: BUCKET_NAME,
          Key: product.imageKey
        });
        await s3.send(deleteCommand);
      } catch (s3Err) {
        console.warn(`Could not delete S3 object ${product.imageKey}:`, s3Err.message);
      }
    }

    products.splice(productIndex, 1);

    res.json({
      message: `Product "${product.name}" deleted successfully`,
      deletedId: req.params.id
    });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: error.message || 'Failed to delete product' });
  }
});

app.listen(PORT, () => {
  console.log(`E-Commerce Store Backend running on http://localhost:${PORT}`);
  console.log(`Configured S3 Bucket: ${BUCKET_NAME || '(none set)'}`);
});
