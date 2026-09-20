# CrimeIntelHub - Crime Analysis and Intelligence Platform

A comprehensive full-stack platform for crime data analysis, visualization, and intelligence gathering. Built with Django, React, and modern GIS technologies.

## 🚨 Security Notice

**CRITICAL**: This application contains sensitive crime data and requires proper security configuration before production deployment. See [Security Configuration](#security-configuration) section.

## 🏗️ Architecture

- **Backend**: Django 5.1.7 + Django REST Framework + PostGIS
- **Frontend**: React 18.3.1 + Vite + Tailwind CSS
- **Database**: PostgreSQL with PostGIS extension
- **Cache**: Redis
- **Authentication**: JWT-based with role-based access control
- **GIS**: Leaflet maps with spatial analysis capabilities

## 🚀 Quick Start

### GIS on Windows / Mac / Linux (recommended)

**Do not install GDAL on Windows.** Local and production use the same Linux Docker image with PostGIS + GDAL.

```bash
# From repo root (Docker Desktop required)
docker compose up --build
```

- Frontend: http://localhost:3000  
- API: http://localhost:8000  
- Health: http://localhost:8000/health/  
- Swagger: http://localhost:8000/swagger/  

On Windows you can also run `scripts\dev-up.cmd`.

Env defaults live in `.env` (repo root) and `backend/.env`. Change `SECRET_KEY` and DB passwords before any real deployment.

### Custom domain (Cloudflare)

For `crime.erickochieng.co.ke` behind Cloudflare + the Compose `production` nginx profile:

1. **DNS** — Cloudflare A record `crime` → Oracle VM public IP (proxied / orange cloud OK).
2. **SSL** — Cloudflare SSL/TLS mode **Flexible** (HTTPS at the edge; origin nginx listens on `:80` only).
3. **Firewall** — Open OCI security list / NSG and UFW for ports **80** and **443**.
4. **Env on the VM** — In root `.env` set (Compose passes these into the backend container):
   - `ALLOWED_HOSTS` including `crime.erickochieng.co.ke`
   - `FRONTEND_URL=https://crime.erickochieng.co.ke`
   - `CORS_ALLOWED_ORIGINS=https://crime.erickochieng.co.ke`
   - `CSRF_TRUSTED_ORIGINS=https://crime.erickochieng.co.ke`
   - `TRUST_X_FORWARDED_PROTO=true` — required for correct HTTPS detection behind Flexible SSL, but only safe when traffic is Cloudflare-proxied / the origin is locked (do not enable if `:80` is open to the world without CF)
   - `VITE_API_BASE_URL=https://crime.erickochieng.co.ke/api`
5. **Start** — `docker compose --profile production up -d`
6. **Frontend bake** — After changing `VITE_API_BASE_URL`, recreate the frontend so Vite picks it up:  
   `docker compose --profile production up -d --build frontend`

- Keep `ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`, `FRONTEND_URL`, `CSRF_TRUSTED_ORIGINS`, and `VITE_API_BASE_URL` aligned with the public HTTPS URL or the UI/API will fail.
- Cloudflare sets/overwrites `X-Forwarded-Proto` by default; keep SSL mode **Flexible** (or Full later). With `TRUST_X_FORWARDED_PROTO=true`, Django trusts that header via `SECURE_PROXY_SSL_HEADER` — do not expose origin `:80` to the public internet if possible (prefer Cloudflare-only / OCI locked to Cloudflare IP ranges) so clients cannot spoof it by hitting the VM directly.
- The nginx `_` catch-all is intentional for IP/localhost health checks; lock down the OCI security list to Cloudflare (or close direct `:80` from `0.0.0.0/0`) if you want to shrink that surface.

See `.env.example` for commented domain values. `deploy/nginx.conf` uses `server_name crime.erickochieng.co.ke _` (named host plus catch-all for IP/localhost probes).

### Optional: map routing (OSRM)

Self-hosted OSRM. Not started by default. Default extract is **Nairobi metro** (low-RAM; works with ~2 GB Docker memory). Full Kenya needs **≥4 GB** Docker RAM for `osrm-extract`.

```bash
# 1) Prepare extract (default: Nairobi metro clip)
./scripts/download-osrm-kenya.sh          # or: ./scripts/download-osrm-kenya.sh kenya

# 2) Build graph + serve
docker compose --profile routing up -d osrm

# Check readiness (Nairobi sample)
curl -s "http://localhost:5000/route/v1/driving/36.82,-1.29;36.80,-1.28?overview=false"
```

The map UI calls Django `GET /api/maps/route/` (proxies to `OSRM_URL`). Without the profile, Directions shows **Routing unavailable**.

Basemap: **Streets** (OSM), **Satellite** / **Hybrid** (Esri World Imagery + optional CARTO/OSM labels).

### Prerequisites

- Docker and Docker Compose
- Node.js 18+ and npm (only if you run the frontend on the host)
- Python 3.11+ (only if you run Django on the host — not recommended on Windows because of GDAL)
- GDAL libraries (only for bare-metal Linux; **not needed** when using Docker)

### Option 1: Docker Compose (Recommended)

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd CrimeIntelHub
   ```

2. **Set up environment variables**
   ```bash
   cp backend/env.example backend/.env
   # Edit backend/.env with your configuration (optional for local Docker defaults)
   ```

3. **Start all services**
   ```bash
   docker compose up --build
   ```

4. **Create a superuser (optional)**
   ```bash
   docker compose exec backend python manage.py createsuperuser
   ```

5. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - Admin: http://localhost:8000/admin
   - Health Check: http://localhost:8000/health

### Option 2: Local Development

1. **Backend Setup**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   
   # Set environment variables
   cp env.example .env
   # Edit .env with your configuration
   
   # Run migrations
   python manage.py migrate
   python manage.py runserver
   ```

2. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

## 🔐 Security Configuration

### Environment Variables

Create a `.env` file in the backend directory with the following variables:

```bash
# Django Settings
SECRET_KEY=your-super-secret-key-here-change-this-in-production
DEBUG=False
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com

# Database Configuration
DB_NAME=crime_analysis_db
DB_USER=crime_analysis_user
DB_PASSWORD=your-secure-database-password
DB_HOST=localhost
DB_PORT=5432

# Redis Configuration
REDIS_URL=redis://username:password@host:port/database

# CORS Configuration
CORS_ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Email Configuration
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
DEFAULT_FROM_EMAIL=noreply@yourdomain.com
EMAIL_HOST=smtp.yourdomain.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@yourdomain.com
EMAIL_HOST_PASSWORD=your-email-password
```

### Production Security Checklist

- [ ] Change `SECRET_KEY` to a strong, unique value
- [ ] Set `DEBUG=False`
- [ ] Configure `ALLOWED_HOSTS` with your domain
- [ ] Use HTTPS with proper SSL certificates
- [ ] Configure secure database connections
- [ ] Set up proper firewall rules
- [ ] Enable rate limiting
- [ ] Configure logging and monitoring
- [ ] Set up backup procedures

## 📊 Features

### User Management
- Multi-role authentication (Admin, Agency, Regular User)
- JWT-based authentication
- Role-based access control
- User activity tracking

### Crime Data Management
- Comprehensive crime incident tracking
- Geographic data with PostGIS
- Media attachments and notes
- Data import/export capabilities

### Analytics & Visualization
- Interactive crime maps
- Heatmap generation
- Time series analysis
- Predictive analytics
- Statistical reporting

### Agency Features
- Data import workflows
- API key management
- Jurisdiction management
- Reporting tools

## 🗄️ Database Schema

### Core Models
- **User**: Extended user model with role-based permissions
- **Agency**: Law enforcement agency information
- **Crime**: Crime incident data with spatial coordinates
- **CrimeCategory**: Hierarchical crime classification
- **District/Neighborhood**: Geographic boundaries
- **CrimeAnalytics**: Predictive models and trends

### Key Relationships
- Users belong to agencies
- Crimes are associated with locations and categories
- Geographic hierarchy: Agency → District → Neighborhood → Crime

## 🔧 Development

### Code Quality

- **Backend**: Follow Django best practices
- **Frontend**: Use React hooks and modern patterns
- **Testing**: Write unit and integration tests
- **Documentation**: Maintain API documentation

### API Structure

```
/api/
├── auth/          # Authentication endpoints
├── agencies/      # Agency management
├── crimes/        # Crime data CRUD
├── analytics/     # Crime analysis
├── alerts/        # Crime alerts
├── reports/       # Report generation
└── etl/          # Data import/export
```

### Testing

```bash
# Backend tests
cd backend
python manage.py test

# Frontend tests
cd frontend
npm test
```

## 📈 Performance & Scalability

### Database Optimization
- Comprehensive indexing strategy
- Query optimization
- Connection pooling
- Read replicas (for production)

### Caching Strategy
- Redis for session storage
- API response caching
- Geographic data caching
- User preference caching

### Frontend Optimization
- Code splitting and lazy loading
- Image optimization
- Bundle size monitoring
- Service worker for offline capabilities

## 🚨 Monitoring & Alerting

### Health Checks
- Database connectivity
- Redis availability
- API response times
- Service status monitoring

### Logging
- Structured logging with JSON format
- Error tracking and alerting
- Performance metrics
- Security event logging

### Error Handling
- Comprehensive error boundaries
- User-friendly error messages
- Error reporting to external services
- Graceful degradation

## 🚀 Deployment

### Production Deployment

1. **Environment Setup**
   ```bash
   # Set production environment variables
   export DJANGO_SETTINGS_MODULE=crime_analysis.settings.production
   export DEBUG=False
   ```

2. **Database Migration**
   ```bash
   python manage.py migrate --settings=crime_analysis.settings.production
   python manage.py collectstatic --settings=crime_analysis.settings.production
   ```

3. **Service Deployment**
   ```bash
   # Using Docker Compose
   docker-compose -f docker-compose.prod.yml up -d
   
   # Or using traditional deployment
   gunicorn crime_analysis.wsgi:application --bind 0.0.0.0:8000
   ```

### CI/CD Pipeline

- Automated testing on pull requests
- Security scanning
- Docker image building
- Automated deployment to staging/production

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

### Development Guidelines

- Follow the existing code style
- Write meaningful commit messages
- Update documentation as needed
- Test your changes thoroughly

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: Check the `/docs` folder
- **Issues**: Report bugs via GitHub Issues
- **Security**: Report security issues privately
- **Community**: Join our discussion forum

## 🔄 Changelog

### Version 1.0.0 (Current)
- Initial release with core functionality
- Multi-role authentication system
- Crime data management
- Geographic visualization
- Basic analytics

### Upcoming Features
- Real-time notifications
- Advanced machine learning models
- Mobile application
- API versioning
- Enhanced security features

---

**⚠️ Important**: This application handles sensitive crime data. Ensure proper security measures are in place before deployment.


