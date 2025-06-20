# Production Deployment Guide

## Option 1: Deploy to Heroku

### Prerequisites
- Heroku account
- Git repository

### Steps
1. **Install Heroku CLI**
   ```bash
   npm install -g heroku
   ```

2. **Login to Heroku**
   ```bash
   heroku login
   ```

3. **Create Heroku App**
   ```bash
   heroku create your-disaster-response-app
   ```

4. **Set Environment Variables**
   ```bash
   heroku config:set NODE_ENV=production
   heroku config:set SUPABASE_URL=your_supabase_url
   heroku config:set SUPABASE_ANON_KEY=your_supabase_anon_key
   heroku config:set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

5. **Deploy**
   ```bash
   git add .
   git commit -m "Deploy to production"
   git push heroku main
   ```

## Option 2: Deploy to Vercel

### Steps
1. **Build the Frontend**
   ```bash
   cd client
   npm run build
   ```

2. **Deploy Backend to Vercel**
   - Connect your GitHub repository to Vercel
   - Set environment variables in Vercel dashboard
   - Deploy

3. **Deploy Frontend to Vercel**
   - Create separate Vercel project for frontend
   - Set build command: `npm run build`
   - Set output directory: `build`

## Option 3: Deploy to Your Own Server

### Prerequisites
- Ubuntu/Debian server
- Node.js 16+ installed
- PM2 for process management

### Steps
1. **Clone Repository**
   ```bash
   git clone your-repo-url
   cd disaster-response-platform
   ```

2. **Install Dependencies**
   ```bash
   npm install
   cd client && npm install && npm run build
   ```

3. **Set Environment Variables**
   ```bash
   cp env.example .env
   # Edit .env with your production values
   ```

4. **Start with PM2**
   ```bash
   npm install -g pm2
   pm2 start server.js --name "disaster-response"
   pm2 startup
   pm2 save
   ```

5. **Set up Nginx (Optional)**
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       location / {
           proxy_pass http://localhost:5000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

## Environment Variables for Production

```env
NODE_ENV=production
PORT=5000
SUPABASE_URL=your_production_supabase_url
SUPABASE_ANON_KEY=your_production_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_production_service_role_key
GEMINI_API_KEY=your_gemini_api_key
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
MAPBOX_ACCESS_TOKEN=your_mapbox_access_token
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
CACHE_TTL=3600
```

## Security Considerations

1. **Enable HTTPS** in production
2. **Set up proper CORS** for your domain
3. **Use environment variables** for all sensitive data
4. **Enable rate limiting** (already configured)
5. **Set up monitoring** and logging
6. **Regular backups** of your database

## Monitoring

1. **Set up logging** with Winston (already configured)
2. **Monitor API endpoints** with tools like UptimeRobot
3. **Set up error tracking** with Sentry
4. **Monitor database performance** in Supabase dashboard 