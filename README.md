# CloudMart — AWS EC2 & S3 Live Demo App

A clean, real-world **E-Commerce Store Application** designed specifically to demonstrate live deployment to **AWS EC2** and media storage on **AWS S3**.

---

## Why this is the perfect live deployment demo:
1. **Clear Real-World Use Case**: An e-commerce store where products are added, listed, and deleted.
2. **Clear AWS S3 Role**: Product images are uploaded directly from the browser to the backend and stored in your AWS S3 bucket. Images are served securely via **AWS S3 Pre-Signed URLs** (or direct keys).
3. **Clear AWS EC2 Role**: The Node.js Express server runs on your EC2 instance, serving the APIs. The top banner displays the real EC2 hostname, OS architecture, and connection status in real-time.
4. **No Heavy Database Dependency**: Uses a clean in-memory product catalog with initial mock items, so you don't get bogged down setting up PostgreSQL/MySQL during a live presentation.

---

## Project Structure

```
d:/aws-deployment/
├── backend/                     # Node.js Express REST API
│   ├── src/
│   │   ├── index.js             # 5 REST routes (health, products CRUD, S3 upload)
│   │   └── s3.js                # AWS S3 client setup (auto IAM / env fallback)
│   ├── .env.example             # AWS_REGION, AWS_S3_BUCKET
│   └── package.json
│
├── frontend/                    # Modern React (Vite) Single Page App
│   ├── src/
│   │   ├── App.jsx              # Store Catalog, Add Product Modal, EC2 Status Banner
│   │   ├── index.css            # Dark mode store styling
│   │   └── main.jsx
│   ├── .env.example             # VITE_API_URL
│   └── package.json
```

---

## 5 Backend API Routes (`backend/src/index.js`)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Returns server health, host name, OS, and memory (proves the EC2 instance is serving requests). |
| `GET` | `/api/products` | Returns all catalog products with fresh S3 pre-signed image URLs. |
| `GET` | `/api/products/:id` | Returns a single product by ID. |
| `POST` | `/api/products` | Accepts `multipart/form-data` (name, price, category, description, and image file) and streams image to S3. |
| `DELETE` | `/api/products/:id` | Deletes a product from the catalog and removes its image from AWS S3. |

---

## Testing Locally Before Your Live Demo

### 1. Start the Backend:
```bash
cd backend
# 1. Fill your AWS_REGION and AWS_S3_BUCKET in backend/.env
npm run dev
# Running on http://localhost:5000
```

### 2. Start the Frontend:
```bash
cd frontend
npm run dev
# Running on http://localhost:3000
```

---

## Live Demo Flow for Your Audience

1. **Show the app running locally first**: Open `http://localhost:3000`. Show how the banner says hostname is your local PC.
2. **Create the S3 Bucket in AWS Console**: (e.g., `cloudmart-store-media-demo`).
3. **Launch the EC2 Instance**:
   - Ubuntu or Amazon Linux.
   - Attach an **IAM Role** with `AmazonS3FullAccess` to the EC2 instance *(explain: zero hardcoded credentials!)*.
4. **Deploy on EC2**:
   - Clone your repo onto EC2.
   - Run `npm install` and start the server.
5. **Point browser to EC2 Public IP**:
   - The banner updates to show the EC2 instance hostname!
   - Upload a new product with an image and show the new file appearing live in your AWS S3 bucket.
