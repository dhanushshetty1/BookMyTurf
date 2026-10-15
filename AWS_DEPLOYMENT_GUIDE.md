# 🚀 BookMyTurf — Complete AWS Deployment Guide

> **Stack:** React (Vite + TypeScript) · Node.js (Express) · PostgreSQL (Prisma ORM) · Docker  
> **AWS Services Used:** EC2 · RDS · S3 · CloudFront · ACM · Route 53 · IAM · Security Groups · ALB

---

## 📋 Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Prerequisites](#2-prerequisites)
3. [IAM — Users, Roles & Policies](#3-iam--users-roles--policies)
4. [S3 Bucket — Image Storage](#4-s3-bucket--image-storage)
5. [RDS — PostgreSQL Database](#5-rds--postgresql-database)
6. [EC2 — Backend Server](#6-ec2--backend-server)
7. [EC2 — (Optional) Self-Hosted Frontend](#7-ec2--optional-self-hosted-frontend)
8. [S3 + CloudFront — Frontend Hosting](#8-s3--cloudfront--frontend-hosting)
9. [ACM — SSL Certificate](#9-acm--ssl-certificate)
10. [Route 53 — Domain Setup](#10-route-53--domain-setup)
11. [Application Load Balancer (ALB)](#11-application-load-balancer-alb)
12. [Environment Variables](#12-environment-variables)
13. [Prisma Migration on AWS](#13-prisma-migration-on-aws)
14. [Security Hardening Checklist](#14-security-hardening-checklist)
15. [Monitoring & Logs](#15-monitoring--logs)
16. [Cost Estimate](#16-cost-estimate)

---

## 1. Architecture Overview

```
Users (Browser)
      │
      ▼
  Route 53 (DNS)
      │
      ├──► CloudFront ──► S3 (React Static Build)   [Frontend]
      │
      └──► ALB (HTTPS :443)
                │
                ▼
           EC2 (Node/Express)  ──► RDS PostgreSQL
                │
                ▼
           S3 Bucket (Turf Images / Uploads)
```

**Flow Summary:**
- Frontend is a **static React build** hosted on S3 + CloudFront (fast, cheap, global CDN).
- Backend runs on an **EC2 t3.small** instance behind an **Application Load Balancer** with HTTPS.
- Database is managed **AWS RDS PostgreSQL** — no server maintenance needed.
- Images uploaded by turf owners go to a dedicated **S3 bucket**.
- All secrets stored in **AWS Systems Manager Parameter Store** (not hardcoded).

---

## 2. Prerequisites

### 2.1 Install Tools Locally

```bash
# AWS CLI
winget install Amazon.AWSCLI

# Verify
aws --version

# Node.js 20+ (already installed)
node --version

# Git
git --version
```

### 2.2 Configure AWS CLI

```bash
aws configure
```

Enter when prompted:
| Field | Value |
|---|---|
| AWS Access Key ID | (from IAM step below) |
| AWS Secret Access Key | (from IAM step below) |
| Default region | `ap-south-1` (Mumbai — best for India) |
| Output format | `json` |

### 2.3 Domain Name

- Purchase a domain from **Route 53** or any registrar (GoDaddy, Namecheap).
- Example used in this guide: `bookmyturf.com`

---

## 3. IAM — Users, Roles & Policies

> **Why:** Never use root account credentials. Create scoped IAM users and roles.

### 3.1 Create a Deployment IAM User

1. Go to **AWS Console → IAM → Users → Create User**
2. Name: `bookmyturf-deploy`
3. Select **Programmatic access**
4. Attach these managed policies:
   - `AmazonS3FullAccess`
   - `AmazonRDSFullAccess`
   - `AmazonEC2FullAccess`
   - `CloudFrontFullAccess`
   - `AmazonSSMFullAccess`
5. Click **Create User** → Download `.csv` with credentials → **Store safely**

### 3.2 Create EC2 Instance Role (for S3 access from EC2)

1. Go to **IAM → Roles → Create Role**
2. Trusted entity: **AWS Service → EC2**
3. Attach policy: `AmazonS3FullAccess` + `AmazonSSMReadOnlyAccess`
4. Name: `bookmyturf-ec2-role`
5. You will attach this role to your EC2 instance later.

### 3.3 Create S3 Bucket Policy (CORS for image uploads)

Will be set in Step 4.

---

## 4. S3 Bucket — Image Storage

> Turf images uploaded via multer currently go to local `/uploads`. On AWS they must go to S3.

### 4.1 Create the Bucket

```bash
aws s3api create-bucket \
  --bucket bookmyturf-images \
  --region ap-south-1 \
  --create-bucket-configuration LocationConstraint=ap-south-1
```

### 4.2 Block Public Access (Secure by Default)

```bash
aws s3api put-public-access-block \
  --bucket bookmyturf-images \
  --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"
```

> Images will be served via **pre-signed URLs** from the backend — not directly public.

### 4.3 Enable Versioning (Optional but Recommended)

```bash
aws s3api put-bucket-versioning \
  --bucket bookmyturf-images \
  --versioning-configuration Status=Enabled
```

### 4.4 Set CORS Policy

Create file `s3-cors.json`:
```json
{
  "CORSRules": [
    {
      "AllowedHeaders": ["*"],
      "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
      "AllowedOrigins": ["https://bookmyturf.com", "https://www.bookmyturf.com"],
      "ExposeHeaders": ["ETag"],
      "MaxAgeSeconds": 3000
    }
  ]
}
```

Apply it:
```bash
aws s3api put-bucket-cors \
  --bucket bookmyturf-images \
  --cors-configuration file://s3-cors.json
```

### 4.5 Update Backend to Use S3 (multer-s3)

Install in server:
```bash
cd server
npm install @aws-sdk/client-s3 multer-s3
```

Update your multer config (in `core/middlewares/upload.middleware.js`):
```js
import { S3Client } from '@aws-sdk/client-s3';
import multerS3 from 'multer-s3';
import multer from 'multer';

const s3 = new S3Client({ region: process.env.AWS_REGION });

export const upload = multer({
  storage: multerS3({
    s3,
    bucket: process.env.S3_BUCKET_NAME,
    key: (req, file, cb) => {
      cb(null, `uploads/${Date.now()}-${file.originalname}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});
```

Add to server `.env`:
```
AWS_REGION=ap-south-1
S3_BUCKET_NAME=bookmyturf-images
```

> **Note:** Since the EC2 instance has the IAM role attached, no AWS keys are needed in the .env.

---

## 5. RDS — PostgreSQL Database

> Replaces your local Postgres / docker-compose postgres container.

### 5.1 Create a Subnet Group

1. Go to **RDS → Subnet Groups → Create**
2. Name: `bookmyturf-db-subnet`
3. VPC: **Default VPC** (or your custom VPC)
4. Add **at least 2 subnets** from different AZs (e.g., `ap-south-1a`, `ap-south-1b`)

### 5.2 Create Security Group for RDS

1. **EC2 → Security Groups → Create**
2. Name: `bookmyturf-rds-sg`
3. Inbound rules:
   | Type | Port | Source |
   |---|---|---|
   | PostgreSQL | 5432 | Security group of EC2 (`bookmyturf-ec2-sg`) |
4. **No public access — only EC2 can reach the DB.**

### 5.3 Launch RDS Instance

1. Go to **RDS → Create Database**
2. Settings:

| Setting | Value |
|---|---|
| Engine | PostgreSQL 15 |
| Template | Free Tier (or Production) |
| DB Identifier | `bookmyturf-db` |
| Master Username | `postgres` |
| Master Password | (strong password, save it) |
| Instance class | `db.t3.micro` (Free Tier) |
| Storage | 20 GB gp2, enable auto-scaling |
| VPC | Default |
| Subnet Group | `bookmyturf-db-subnet` |
| Public Access | **NO** |
| Security Group | `bookmyturf-rds-sg` |
| Database name | `bookmyturf` |

3. Click **Create Database** — takes ~5 minutes.
4. After creation, copy the **Endpoint** (looks like `bookmyturf-db.xxxxxx.ap-south-1.rds.amazonaws.com`).

Your `DATABASE_URL` will be:
```
postgresql://postgres:YOUR_PASSWORD@bookmyturf-db.xxxxxx.ap-south-1.rds.amazonaws.com:5432/bookmyturf?schema=public
```

---

## 6. EC2 — Backend Server

### 6.1 Create Security Group for EC2

1. **EC2 → Security Groups → Create**
2. Name: `bookmyturf-ec2-sg`
3. Inbound rules:

| Type | Port | Source | Reason |
|---|---|---|---|
| SSH | 22 | Your IP only | Admin access |
| HTTP | 80 | Anywhere (ALB will redirect) | ALB health checks |
| Custom TCP | 5000 | ALB Security Group | Node.js app |

4. Outbound: Allow all (default)

### 6.2 Create Key Pair

1. **EC2 → Key Pairs → Create Key Pair**
2. Name: `bookmyturf-key`
3. Type: RSA, Format: `.pem`
4. Download and store safely (e.g., `C:\Users\dhanu\.ssh\bookmyturf-key.pem`)

On Windows, set permissions:
```powershell
icacls "C:\Users\dhanu\.ssh\bookmyturf-key.pem" /inheritance:r /grant:r "$($env:USERNAME):(R)"
```

### 6.3 Launch EC2 Instance

1. Go to **EC2 → Launch Instance**
2. Settings:

| Setting | Value |
|---|---|
| Name | `bookmyturf-backend` |
| AMI | Ubuntu Server 24.04 LTS (64-bit x86) |
| Instance Type | `t3.small` (2 vCPU, 2GB RAM) |
| Key Pair | `bookmyturf-key` |
| Security Group | `bookmyturf-ec2-sg` |
| Storage | 20 GB gp3 |
| IAM Instance Profile | `bookmyturf-ec2-role` |

3. Launch Instance.

### 6.4 Connect to EC2

```bash
ssh -i "C:\Users\dhanu\.ssh\bookmyturf-key.pem" ubuntu@<EC2_PUBLIC_IP>
```

### 6.5 Install Dependencies on EC2

Run these commands on the EC2 instance:

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 (process manager — keeps app running)
sudo npm install -g pm2

# Install Git
sudo apt install -y git

# Verify
node --version   # v20.x
npm --version
pm2 --version
```

### 6.6 Deploy the Backend

```bash
# Clone your repo
git clone https://github.com/YOUR_USERNAME/BookMyTurf.git /home/ubuntu/bookmyturf
cd /home/ubuntu/bookmyturf/server

# Install dependencies
npm install

# Generate Prisma client
npx prisma generate
```

### 6.7 Create .env on EC2

```bash
nano /home/ubuntu/bookmyturf/server/.env
```

Paste:
```env
PORT=5000
NODE_ENV=production
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@bookmyturf-db.xxxxxx.ap-south-1.rds.amazonaws.com:5432/bookmyturf?schema=public
JWT_SECRET=your_super_strong_32_char_secret_here
CLIENT_URL=https://bookmyturf.com
AWS_REGION=ap-south-1
S3_BUCKET_NAME=bookmyturf-images
```

Save: `Ctrl+X → Y → Enter`

### 6.8 Run Database Migrations

```bash
cd /home/ubuntu/bookmyturf/server
npx prisma db push
```

You should see: `✔ Your database is now in sync with your Prisma schema.`

### 6.9 Start Backend with PM2

```bash
cd /home/ubuntu/bookmyturf/server
pm2 start npm --name "bookmyturf-api" -- start
pm2 save
pm2 startup  # Follow the printed command to auto-start on reboot
```

**Test the backend:**
```bash
curl http://localhost:5000/health
# Expected: {"status":"OK","message":"BookMyTurf API is running"}
```

### 6.10 Allocate Elastic IP (Static IP for EC2)

1. **EC2 → Elastic IPs → Allocate**
2. Click **Associate** → Select your EC2 instance
3. This gives a permanent IP so it doesn't change on reboot.

---

## 7. EC2 — (Optional) Self-Hosted Frontend

> **Skip this step if using S3 + CloudFront** (recommended — cheaper and faster).  
> Only follow if you want to serve React from the same EC2.

```bash
# On EC2
sudo apt install -y nginx

# Build frontend locally and copy:
# (On your local machine)
cd client
npm run build
scp -i bookmyturf-key.pem -r dist/* ubuntu@<EC2_IP>:/var/www/html/

# Configure Nginx
sudo nano /etc/nginx/sites-available/bookmyturf
```

Nginx config:
```nginx
server {
    listen 80;
    server_name bookmyturf.com www.bookmyturf.com;
    root /var/www/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/bookmyturf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## 8. S3 + CloudFront — Frontend Hosting

> **Recommended approach** — serves React static files globally with CDN.

### 8.1 Create Frontend S3 Bucket

```bash
aws s3api create-bucket \
  --bucket bookmyturf-frontend \
  --region ap-south-1 \
  --create-bucket-configuration LocationConstraint=ap-south-1
```

### 8.2 Enable Static Website Hosting

```bash
aws s3 website s3://bookmyturf-frontend/ \
  --index-document index.html \
  --error-document index.html
```

### 8.3 Build and Upload Frontend

On your **local machine**:
```bash
cd client

# Set production env
echo "VITE_API_URL=https://api.bookmyturf.com/api" > .env.production
echo "VITE_IMAGE_BASE_URL=https://d1xxxxx.cloudfront.net" >> .env.production

# Build
npm run build

# Upload to S3
aws s3 sync dist/ s3://bookmyturf-frontend/ --delete
```

### 8.4 Create CloudFront Distribution

1. Go to **CloudFront → Create Distribution**
2. Settings:

| Setting | Value |
|---|---|
| Origin Domain | `bookmyturf-frontend.s3.ap-south-1.amazonaws.com` |
| Origin Access | **Origin Access Control (OAC)** — create new |
| Viewer Protocol | Redirect HTTP to HTTPS |
| Allowed Methods | GET, HEAD |
| Cache Policy | `CachingOptimized` |
| Compress Objects | Yes |
| Alternate Domain Names | `bookmyturf.com`, `www.bookmyturf.com` |
| SSL Certificate | (from ACM — Step 9) |
| Default Root Object | `index.html` |

3. **Error Pages** → Add custom error:
   - HTTP Error Code: `403` → Response: `/index.html` → HTTP 200
   - HTTP Error Code: `404` → Response: `/index.html` → HTTP 200
   
   > This fixes React Router — all paths serve `index.html`.

4. After OAC is created, CloudFront will show a **bucket policy** — apply it to S3.

---

## 9. ACM — SSL Certificate

> Free HTTPS certificates via AWS Certificate Manager.

### 9.1 Request Certificate

1. Go to **ACM → Request Certificate** (⚠️ **Must be in `us-east-1`** for CloudFront)
   
   Switch region to **US East (N. Virginia)** first!

2. Settings:
   - Type: Public
   - Domain: `bookmyturf.com`
   - Add another: `*.bookmyturf.com` (covers www, api, etc.)
   - Validation: **DNS validation** (recommended)

3. Click **Request** → You'll see CNAME records to add.

### 9.2 Validate Certificate (DNS)

1. In ACM, click **Create records in Route 53** (if using Route 53) — auto-creates CNAME.
2. Wait ~5 minutes → Status becomes **Issued ✅**

---

## 10. Route 53 — Domain Setup

### 10.1 Create Hosted Zone

1. **Route 53 → Hosted Zones → Create**
2. Domain: `bookmyturf.com`
3. Type: Public
4. Copy the **4 NS (Name Server) records** shown.
5. Go to your domain registrar → Update nameservers to these 4 AWS ones.

### 10.2 Create DNS Records

| Record Name | Type | Value |
|---|---|---|
| `bookmyturf.com` | A (Alias) | → CloudFront distribution |
| `www.bookmyturf.com` | CNAME | `bookmyturf.com` |
| `api.bookmyturf.com` | A (Alias) | → ALB DNS name |

### 10.3 Add ACM Validation CNAMEs

(Already done automatically if you clicked "Create in Route 53" in Step 9)

---

## 11. Application Load Balancer (ALB)

> Routes HTTPS traffic to your EC2 backend securely.

### 11.1 Create ALB Security Group

1. **EC2 → Security Groups → Create**
2. Name: `bookmyturf-alb-sg`
3. Inbound:
   | Type | Port | Source |
   |---|---|---|
   | HTTP | 80 | Anywhere |
   | HTTPS | 443 | Anywhere |

### 11.2 Create Target Group

1. **EC2 → Target Groups → Create**
2. Settings:
   | Setting | Value |
   |---|---|
   | Target Type | Instances |
   | Name | `bookmyturf-api-tg` |
   | Protocol | HTTP |
   | Port | 5000 |
   | Health Check Path | `/health` |
3. Register your EC2 instance as a target.

### 11.3 Create ALB

1. **EC2 → Load Balancers → Create → Application Load Balancer**
2. Settings:
   | Setting | Value |
   |---|---|
   | Name | `bookmyturf-alb` |
   | Scheme | Internet-facing |
   | IP type | IPv4 |
   | VPC | Default |
   | Subnets | Select 2+ subnets (different AZs) |
   | Security Group | `bookmyturf-alb-sg` |

3. **Listeners:**
   - Port 80 (HTTP) → Action: **Redirect to HTTPS**
   - Port 443 (HTTPS) → Action: Forward to `bookmyturf-api-tg`
   - Certificate: Select ACM cert for `api.bookmyturf.com`

4. Create → Copy **ALB DNS name** for Route 53 Step 10.2.

---

## 12. Environment Variables

### Backend `.env` (Production — on EC2)

```env
PORT=5000
NODE_ENV=production

# RDS PostgreSQL
DATABASE_URL=postgresql://postgres:YOUR_RDS_PASSWORD@bookmyturf-db.xxxxxx.ap-south-1.rds.amazonaws.com:5432/bookmyturf?schema=public

# Auth
JWT_SECRET=use_a_64_char_random_string_here_generate_with_openssl_rand

# CORS
CLIENT_URL=https://bookmyturf.com

# AWS S3
AWS_REGION=ap-south-1
S3_BUCKET_NAME=bookmyturf-images
```

Generate a strong JWT secret:
```bash
# Run locally
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Frontend `.env.production` (used during build)

```env
VITE_API_URL=https://api.bookmyturf.com/api
VITE_IMAGE_BASE_URL=https://d1xxxxxxxxxxxxx.cloudfront.net
```

---

## 13. Prisma Migration on AWS

After any schema change:

```bash
# SSH into EC2
ssh -i bookmyturf-key.pem ubuntu@<EC2_IP>

cd /home/ubuntu/bookmyturf/server

# Pull latest code
git pull origin main

# Install new dependencies if any
npm install

# Re-generate Prisma client
npx prisma generate

# Push schema changes to RDS
npx prisma db push

# Restart the app
pm2 restart bookmyturf-api
pm2 logs bookmyturf-api
```

---

## 14. Security Hardening Checklist

### EC2 Security
- [x] SSH only from your IP (not `0.0.0.0/0`)
- [x] IAM Role attached (no hardcoded AWS keys)
- [x] Elastic IP associated
- [ ] Disable password authentication in SSH:
  ```bash
  sudo nano /etc/ssh/sshd_config
  # Set: PasswordAuthentication no
  sudo systemctl restart sshd
  ```
- [ ] Enable automatic security updates:
  ```bash
  sudo apt install unattended-upgrades -y
  sudo dpkg-reconfigure --priority=low unattended-upgrades
  ```

### RDS Security
- [x] No public access
- [x] Only reachable from EC2 security group
- [x] Strong master password
- [ ] Enable automated backups (7-day retention in RDS settings)
- [ ] Enable encryption at rest (set during creation: Storage → Encryption → Enable)

### S3 Security
- [x] Public access blocked
- [x] CORS configured for your domain only
- [ ] Enable S3 bucket versioning
- [ ] Enable S3 access logging:
  ```bash
  aws s3api put-bucket-logging \
    --bucket bookmyturf-images \
    --bucket-logging-status '{"LoggingEnabled":{"TargetBucket":"bookmyturf-images","TargetPrefix":"logs/"}}'
  ```

### Application Security
- [x] CORS restricted to `https://bookmyturf.com`
- [x] JWT secret is long and random
- [ ] Add **rate limiting** to Express:
  ```bash
  cd server && npm install express-rate-limit
  ```
  ```js
  import rateLimit from 'express-rate-limit';
  const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
  app.use('/api/', limiter);
  ```
- [ ] Add **helmet** for security headers:
  ```bash
  npm install helmet
  ```
  ```js
  import helmet from 'helmet';
  app.use(helmet());
  ```

### IAM Security
- [x] No root account used for deployment
- [x] Least-privilege IAM policies
- [ ] Enable MFA on root account
- [ ] Rotate access keys every 90 days

---

## 15. Monitoring & Logs

### PM2 Logs (Application)
```bash
pm2 logs bookmyturf-api         # Live logs
pm2 logs bookmyturf-api --lines 100  # Last 100 lines
pm2 monit                        # Real-time CPU/Memory dashboard
```

### CloudWatch (AWS Native)

1. **EC2 → CloudWatch → Create Alarm**
2. Metric: `CPUUtilization` > 80% → SNS email alert
3. Also set alarm for: `StatusCheckFailed`

Enable detailed monitoring:
```bash
# Install CloudWatch agent on EC2
sudo apt install amazon-cloudwatch-agent -y
```

### RDS Monitoring
- Go to **RDS → Your DB → Monitoring tab**
- Enable **Enhanced Monitoring** for 60-second granularity

### ALB Access Logs
1. **EC2 → Load Balancers → Your ALB → Attributes**
2. Enable Access Logs → Point to an S3 bucket

---

## 16. Cost Estimate

> Approximate monthly costs in `ap-south-1` (Mumbai):

| Service | Config | Est. Cost/Month |
|---|---|---|
| EC2 t3.small | Backend server | ~$15 |
| RDS db.t3.micro | PostgreSQL | ~$15 |
| S3 | Images + Frontend | ~$2 |
| CloudFront | 1TB transfer | ~$3 |
| ALB | 1 instance | ~$18 |
| Route 53 | 1 hosted zone | ~$0.50 |
| ACM Certificate | HTTPS | **Free** |
| Data Transfer | ~50GB/month | ~$5 |
| **Total** | | **~$58–65/month** |

**To reduce costs:**
- Use **EC2 Reserved Instances** (1-year) → saves ~40%
- Use **RDS Free Tier** (db.t3.micro, 20GB) for first 12 months
- Consider **Elastic Beanstalk** to simplify EC2 + ALB management

---

## 🚀 Quick Deploy Checklist

```
PHASE 1 — AWS Setup
[ ] 1. Create IAM user + EC2 role
[ ] 2. Create S3 bucket for images (bookmyturf-images)
[ ] 3. Create RDS PostgreSQL instance
[ ] 4. Note down RDS endpoint

PHASE 2 — Backend Deployment
[ ] 5. Create EC2 security groups
[ ] 6. Launch EC2 t3.small (Ubuntu 24.04)
[ ] 7. Attach IAM role to EC2
[ ] 8. SSH in and install Node.js 20 + PM2
[ ] 9. Clone repo and npm install
[ ] 10. Create .env with production values
[ ] 11. Run: npx prisma db push
[ ] 12. Start: pm2 start npm --name bookmyturf-api -- start
[ ] 13. Test: curl http://localhost:5000/health

PHASE 3 — Domain & HTTPS
[ ] 14. Request ACM certificate (us-east-1) for *.bookmyturf.com
[ ] 15. Create Route 53 hosted zone
[ ] 16. Update domain registrar nameservers
[ ] 17. Create ALB with HTTPS listener
[ ] 18. Point api.bookmyturf.com → ALB

PHASE 4 — Frontend Deployment
[ ] 19. Create S3 bucket for frontend
[ ] 20. Create CloudFront distribution
[ ] 21. Build React: npm run build (with production env)
[ ] 22. Upload: aws s3 sync dist/ s3://bookmyturf-frontend/
[ ] 23. Point bookmyturf.com → CloudFront

PHASE 5 — Security & Monitoring
[ ] 24. Add rate limiting + helmet to backend
[ ] 25. Enable RDS automated backups
[ ] 26. Set up CloudWatch CPU alarm
[ ] 27. Test full flow end-to-end
```

---

## 🆘 Troubleshooting

| Problem | Fix |
|---|---|
| `npm run build` fails | Check `VITE_API_URL` is set in `.env.production` |
| EC2 can't reach RDS | Verify EC2 security group is the inbound source in RDS SG |
| `prisma db push` timeout | Check RDS is in same VPC, not publicly accessible |
| API returns 502 from ALB | Check target group health — is port 5000 open in EC2 SG? |
| CORS errors in browser | Update `CLIENT_URL` in backend `.env` to match your domain |
| Images not uploading | Check IAM role has S3 permissions, correct bucket name in env |
| CloudFront returns 403 | Apply the OAC bucket policy to the frontend S3 bucket |
| React routes return 404 | Add custom error pages in CloudFront (403/404 → `/index.html`) |

---

*Guide generated for BookMyTurf — React + Node.js + PostgreSQL + Prisma stack.*  
*Last updated: April 2026*
