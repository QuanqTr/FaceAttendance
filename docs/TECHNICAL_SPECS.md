# 🔧 Technical Specifications - Reporting System

## 📋 Architecture Overview

### Frontend Stack
- **Framework:** React 18+ with TypeScript
- **Routing:** React Router v6
- **State Management:** React Query (TanStack Query) v4
- **UI Components:** Shadcn/ui + Tailwind CSS
- **Charts:** Recharts v2.8+
- **Icons:** Lucide React

### Backend Stack
- **Runtime:** Node.js 18+
- **Framework:** Express.js
- **Database:** PostgreSQL 14+
- **ORM:** Drizzle ORM
- **Authentication:** JWT + Passport.js
- **API Format:** REST JSON

---

## 🗄️ Database Schema

### Core Tables

#### `attendance_summary`
```sql
CREATE TABLE attendance_summary (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL,
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    total_hours DECIMAL(8,2) DEFAULT 0,
    overtime_hours DECIMAL(8,2) DEFAULT 0,
    leave_days INTEGER DEFAULT 0,
    late_minutes INTEGER DEFAULT 0,
    early_minutes INTEGER DEFAULT 0,
    penalty_amount DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    
    FOREIGN KEY (employee_id) REFERENCES employees(id),
    UNIQUE(employee_id, month, year)
);
```

#### `employees`
```sql
CREATE TABLE employees (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    position VARCHAR(100),
    department_id INTEGER,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW(),
    
    FOREIGN KEY (department_id) REFERENCES departments(id)
);
```

#### `departments`
```sql
CREATE TABLE departments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Indexes for Performance
```sql
-- Performance indexes for reports
CREATE INDEX idx_attendance_summary_month_year ON attendance_summary(month, year);
CREATE INDEX idx_attendance_summary_employee_id ON attendance_summary(employee_id);
CREATE INDEX idx_employees_department_id ON employees(department_id);
CREATE INDEX idx_attendance_summary_created_at ON attendance_summary(created_at);
```

---

## 🚀 API Endpoints

### Base URL: `/api/reports`

#### 1. Overall Statistics
```typescript
GET /api/reports/overall-stats
Query Parameters:
  - month: number (required)
  - year: number (required)
  - startDate: string (ISO date, required)
  - endDate: string (ISO date, required)

Response: OverallStats
{
  totalEmployees: number;
  totalHours: number;
  avgHoursPerEmployee: number;
  totalOvertimeHours: number;
  avgOvertimePerEmployee: number;
  totalLeaveDays: number;
  avgLeaveDaysPerEmployee: number;
  totalLateMinutes: number;
  avgLateMinutesPerEmployee: number;
  totalPenaltyAmount: number;
  avgPenaltyPerEmployee: number;
  fullTimeEmployees: number;
  partTimeEmployees: number;
  absentEmployees: number;
}
```

#### 2. Department Statistics
```typescript
GET /api/reports/department-stats
Query Parameters: Same as overall-stats

Response: DepartmentStats[]
{
  departmentId: number;
  departmentName: string;
  employeeCount: number;
  avgTotalHours: number;
  totalDepartmentHours: number;
  avgOvertimeHours: number;
  totalLeaveDays: number;
  avgLateMinutes: number;
  totalPenaltyAmount: number;
}[]
```

#### 3. Monthly Attendance Report
```typescript
GET /api/reports/monthly-attendance
Query Parameters:
  - month, year, startDate, endDate (required)
  - departmentId: string (optional, filter by department)

Response: AttendanceRecord[]
{
  id: number;
  employeeId: number;
  employeeName: string;
  position: string;
  departmentName: string;
  month: number;
  year: number;
  totalHours: number;
  overtimeHours: number;
  leaveDays: number;
  earlyMinutes: number;
  lateMinutes: number;
  penaltyAmount: number;
  createdAt: string;
}[]
```

#### 4. Top Performers
```typescript
GET /api/reports/top-performers
Query Parameters:
  - month, year, startDate, endDate (required)
  - limit: number (optional, default: 10)

Response: TopPerformer[]
{
  employeeId: number;
  employeeName: string;
  position: string;
  departmentName: string;
  totalHours: number;
  overtimeHours: number;
  lateMinutes: number;
  penaltyAmount: number;
}[]
```

#### 5. Penalty Analysis
```typescript
GET /api/reports/penalty-analysis
Query Parameters: Same as overall-stats

Response: PenaltyAnalysis[]
{
  employeeId: number;
  employeeName: string;
  position: string;
  departmentName: string;
  lateMinutes: number;
  earlyMinutes: number;
  penaltyAmount: number;
  penaltyLevel: 'Không phạt' | 'Phạt nhẹ' | 'Phạt trung bình' | 'Phạt nặng';
}[]
```

#### 6. Attendance Trends
```typescript
GET /api/reports/attendance-trends
Query Parameters:
  - year: number (required)
  - months: string (optional, comma-separated months)

Response: AttendanceTrend[]
{
  month: number;
  employeeCount: number;
  totalHours: number;
  avgHours: number;
  totalOvertime: number;
  totalLeaveDays: number;
  totalPenalties: number;
}[]
```

---

## 🎨 Frontend Components Architecture

### File Structure
```
client/src/pages/
└── reports.tsx                 # Main reports page (1,262 lines)

client/src/components/ui/
├── card.tsx                    # Card components
├── button.tsx                  # Button components
├── select.tsx                  # Dropdown selects
├── tabs.tsx                    # Tab navigation
├── table.tsx                   # Data tables
└── badge.tsx                   # Status badges

client/src/lib/
└── api.ts                      # API request utility
```

### Component Hierarchy
```
Reports (Main Page)
├── Header Section
│   ├── Title & Description
│   └── Controls (Month/Year/Department Selectors)
├── Tabs Navigation (6 tabs)
├── Tab Content
│   ├── Overview Tab
│   │   ├── Stats Cards (4)
│   │   ├── Department Rankings
│   │   └── Penalty Analysis Chart
│   ├── Trends Tab
│   │   ├── Hours Trend Chart
│   │   ├── Penalty Trend Chart
│   │   └── Comparative Analysis Chart
│   ├── Charts Tab
│   │   ├── Department Hours Chart
│   │   ├── Employee Type Distribution
│   │   ├── Regular vs Overtime Chart
│   │   └── Penalty Distribution Chart
│   ├── Attendance Tab
│   │   ├── Summary Cards (4)
│   │   ├── Filter Controls
│   │   └── Data Table
│   ├── Performers Tab
│   │   ├── Performance Summary (3 cards)
│   │   └── Top 10 Employee Cards
│   └── Penalties Tab
│       ├── Violation Stats (4 cards)
│       ├── Level Classification (4 cards)
│       └── Detailed Violations Table
```

### State Management with React Query
```typescript
// Query keys for caching
const queryKeys = {
  overallStats: ['/api/reports/overall-stats', month, year],
  departmentStats: ['/api/reports/department-stats', month, year],
  attendanceRecords: ['/api/reports/monthly-attendance', month, year, dept],
  topPerformers: ['/api/reports/top-performers', month, year],
  penaltyAnalysis: ['/api/reports/penalty-analysis', month, year],
  attendanceTrends: ['/api/reports/attendance-trends', year]
};

// Query configuration
const queryConfig = {
  staleTime: 5 * 60 * 1000,     // 5 minutes
  cacheTime: 10 * 60 * 1000,    // 10 minutes
  refetchOnWindowFocus: false,
  retry: 3
};
```

---

## 📊 Chart Configurations

### Recharts Setup
```typescript
// Common chart dimensions
const CHART_HEIGHT = 300;
const CHART_COLORS = [
  '#8884d8', '#82ca9d', '#ffc658', '#ff7300', 
  '#00ff7f', '#ff1493', '#00bfff', '#ffd700'
];

// Responsive container configuration
<ResponsiveContainer width="100%" height={CHART_HEIGHT}>
  <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 70 }}>
    <CartesianGrid strokeDasharray="3 3" />
    <XAxis dataKey="name" angle={-45} textAnchor="end" height={70} />
    <YAxis />
    <Tooltip formatter={customFormatter} />
    <Bar dataKey="value" fill="#8884d8" radius={[4, 4, 0, 0]} />
  </BarChart>
</ResponsiveContainer>
```

### Chart Types Used
1. **Area Chart** - Trends over time
2. **Line Chart** - Penalty trends
3. **Bar Chart** - Department comparisons
4. **Pie Chart** - Distributions
5. **Grouped Bar Chart** - Multi-metric comparisons

---

## 🎨 Styling System

### Tailwind CSS Classes
```typescript
// Color system for penalty levels
const penaltyColors = {
  none: 'bg-green-50 text-green-800 border-green-200',
  light: 'bg-yellow-50 text-yellow-800 border-yellow-200',
  medium: 'bg-orange-50 text-orange-800 border-orange-200',
  heavy: 'bg-red-50 text-red-800 border-red-200'
};

// Responsive grid system
const gridClasses = {
  cards: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4',
  charts: 'grid grid-cols-1 lg:grid-cols-2 gap-6',
  fullWidth: 'grid grid-cols-1 gap-6'
};
```

### Custom CSS Classes (index.css)
```css
.bg-gold {
  background: linear-gradient(45deg, #ffd700, #ffed4e);
}

.bg-silver {
  background: linear-gradient(45deg, #c0c0c0, #e5e5e5);
}

.bg-bronze {
  background: linear-gradient(45deg, #cd7f32, #daa520);
}
```

---

## ⚡ Performance Optimizations

### Frontend Optimizations
1. **React Query Caching**
   - 5-minute stale time
   - 10-minute cache time
   - Smart invalidation on filter changes

2. **Component Optimization**
   - Memoized chart components
   - Virtualized large tables (if needed)
   - Lazy loading for heavy components

3. **Bundle Optimization**
   - Code splitting by routes
   - Tree shaking for unused Recharts components
   - Optimized Tailwind CSS

### Backend Optimizations
1. **Database Indexing**
   - Composite indexes on (month, year)
   - Foreign key indexes
   - Created_at indexes for time-based queries

2. **Query Optimization**
   - Efficient JOINs with LEFT JOIN
   - Aggregation at database level
   - Pagination for large datasets

3. **Caching Strategy**
   - Redis caching for frequently accessed data
   - ETag headers for client-side caching
   - Gzip compression

---

## 🔒 Security Considerations

### Authentication & Authorization
```typescript
// Role-based access control
const allowedRoles = ['admin', 'manager'];

// Middleware protection
app.use('/api/reports', authenticateJWT);
app.use('/api/reports', authorize(allowedRoles));
```

### Data Validation
```typescript
// Query parameter validation
const validateReportParams = (req: Request, res: Response, next: NextFunction) => {
  const { month, year, startDate, endDate } = req.query;
  
  if (!month || !year || !startDate || !endDate) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }
  
  // Additional validation logic
  next();
};
```

### SQL Injection Prevention
- Parameterized queries with PostgreSQL client
- Input sanitization
- Type validation with TypeScript

---

## 🧪 Testing Strategy

### Unit Tests
```typescript
// API endpoint tests
describe('Report Controller', () => {
  test('should return overall stats', async () => {
    const response = await request(app)
      .get('/api/reports/overall-stats')
      .query({ month: 1, year: 2024, startDate: '2024-01-01', endDate: '2024-01-31' })
      .expect(200);
    
    expect(response.body).toHaveProperty('totalEmployees');
  });
});

// Frontend component tests
describe('Reports Component', () => {
  test('should render all tabs', () => {
    render(<Reports />);
    expect(screen.getByText('Tổng quan')).toBeInTheDocument();
    expect(screen.getByText('Xu hướng')).toBeInTheDocument();
  });
});
```

### Integration Tests
- Database query tests
- API endpoint integration tests
- Frontend-backend integration tests

### Performance Tests
- Load testing with large datasets
- Memory leak detection
- Chart rendering performance

---

## 📈 Monitoring & Logging

### Backend Logging
```typescript
// Structured logging
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'reports.log' })
  ]
});

// Performance monitoring
const reportPerformance = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`Report API: ${req.path} - ${duration}ms`);
  });
  next();
};
```

### Frontend Error Tracking
```typescript
// Error boundary for charts
class ChartErrorBoundary extends React.Component {
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Chart rendering error:', error, errorInfo);
    // Send to error tracking service
  }
}
```

---

## 🚀 Deployment Configuration

### Environment Variables
```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/facetimekeeping

# API Configuration
API_BASE_URL=http://localhost:3001
JWT_SECRET=your-secret-key

# Chart Configuration
CHART_CACHE_DURATION=300000  # 5 minutes
```

### Docker Configuration
```dockerfile
# Frontend
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]

# Backend
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3001
CMD ["npm", "run", "start:prod"]
```

---

## 📚 Development Guidelines

### Code Style
- **TypeScript strict mode**
- **ESLint + Prettier** for formatting
- **Conventional commits** for git messages
- **Component naming**: PascalCase
- **Function naming**: camelCase

### API Design Principles
- RESTful endpoints
- Consistent error responses
- Comprehensive input validation
- Proper HTTP status codes
- JSON response format

### Component Design Principles
- Single responsibility
- Reusable components
- Props type safety
- Error boundaries
- Loading states

---

## 🔧 Maintenance & Updates

### Regular Tasks
1. **Database maintenance**
   - Index optimization
   - Query performance review
   - Data archiving for old records

2. **Frontend updates**
   - Dependency updates
   - Performance audits
   - Accessibility compliance

3. **Monitoring**
   - API response times
   - Chart rendering performance
   - User interaction analytics

### Backup Strategy
- Daily database backups
- Weekly full system backups
- Quarterly disaster recovery tests

---

## 📞 Developer Support

### Common Issues & Solutions

**1. Chart not rendering**
```typescript
// Solution: Check data format
const chartData = data?.map(item => ({
  ...item,
  value: Number(item.value) // Ensure numeric values
})) || [];
```

**2. API timeout**
```typescript
// Solution: Implement request timeout
const apiRequest = async (url: string, options = {}) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeout);
    return response;
  } catch (error) {
    clearTimeout(timeout);
    throw error;
  }
};
```

**3. Memory leaks in charts**
```typescript
// Solution: Cleanup on unmount
useEffect(() => {
  return () => {
    // Cleanup chart instances
    chartRef.current?.dispose();
  };
}, []);
```

### Documentation Updates
This technical specification should be updated whenever:
- New API endpoints are added
- Database schema changes
- Major component refactoring
- Performance optimizations
- Security updates

---

**📝 Last updated:** [Current Date]  
**📋 Version:** 1.0.0  
**👨‍💻 Maintainer:** Development Team 