# Scenario Builder Feature

## Overview
The Scenario Builder is a new feature that allows users to quickly create comprehensive demo environments with realistic data for NetSuite demonstrations. It automates the creation of customers, projects, and time entries based on predefined templates.

## Features

### 🎯 Scenario Templates
- **Standard Technology Demo**: Basic demo with tech companies and common projects
- **Enterprise Solutions Demo**: Large-scale enterprise implementations
- **Professional Services Demo**: Consulting and advisory services scenarios

### 🏗️ Automated Data Creation
- **Customer Records**: Complete customer profiles with industry classification
- **Project Management**: Realistic projects with budgets, timelines, and descriptions
- **Time Entry Generation**: Automated time tracking data with different resource types

### 📊 Resource Planning
- Multiple resource types (consultants, developers, project managers)
- Configurable utilization rates and billable rates
- Realistic hour distributions and approval workflows

## API Endpoints

### Build Scenario
```http
POST /api/netsuite/scenarios
Content-Type: application/json

{
  "scenarioType": "standard",
  "customerCount": 3,
  "projectsPerCustomer": 2,
  "timeEntriesPerProject": 15
}
```

**Response:**
```json
{
  "success": true,
  "scenario": "standard",
  "results": {
    "customers": [...],
    "projects": [...],
    "timeEntries": [...],
    "summary": {
      "customersCreated": 3,
      "projectsCreated": 6,
      "timeEntriesCreated": 90
    }
  }
}
```

### Get Scenario Templates
```http
GET /api/netsuite/scenarios/templates
```

**Response:**
```json
{
  "standard": {
    "name": "Standard Demo",
    "description": "Basic demo with technology companies",
    "customers": 3,
    "projectTypes": ["Digital Transformation", "Cloud Migration", "Mobile Development"]
  },
  "enterprise": {
    "name": "Enterprise Demo", 
    "description": "Large-scale enterprise scenarios",
    "customers": 3,
    "projectTypes": ["ERP Implementation", "Process Optimization", "Compliance Management"]
  }
}
```

## Usage Examples

### Quick Standard Demo Setup
```javascript
// Create a standard demo scenario
const response = await fetch('/api/netsuite/scenarios', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    scenarioType: 'standard',
    customerCount: 3,
    projectsPerCustomer: 2,
    timeEntriesPerProject: 20
  })
});

const scenario = await response.json();
console.log(`Created ${scenario.results.summary.customersCreated} customers`);
```

### Enterprise Demo for Large Presentations
```javascript
// Create comprehensive enterprise scenario
const response = await fetch('/api/netsuite/scenarios', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    scenarioType: 'enterprise',
    customerCount: 5,
    projectsPerCustomer: 3,
    timeEntriesPerProject: 50
  })
});
```

## Scenario Templates Detail

### Standard Technology Demo
- **ACME Corporation**: Technology company with digital transformation projects
- **Global Solutions Inc**: Consulting firm with cloud migration initiatives  
- **Innovation Labs**: Software development company with mobile app projects

**Typical Projects:**
- Digital Transformation Initiative (90 days, $150k)
- Cloud Migration Project (60 days, $80k)
- Mobile App Development (120 days, $200k)

### Enterprise Solutions Demo
- **Enterprise Corporation**: Financial services with ERP implementations
- **Mega Industries**: Manufacturing company with process optimization
- **Corporate Healthcare**: Healthcare provider with compliance projects

**Typical Projects:**
- ERP Implementation & Integration (180 days, $500k)
- Business Process Optimization (120 days, $300k)
- Compliance Management System (90 days, $250k)

### Professional Services Demo
- **Premier Retail Group**: Retail company needing strategic planning
- **Regional Credit Union**: Financial institution with change management needs
- **TechStart Innovations**: Startup requiring process improvement

**Typical Projects:**
- Strategic Planning & Roadmap (45 days, $75k)
- Change Management Initiative (75 days, $120k) 
- Process Improvement Analysis (30 days, $45k)

## Resource Types & Rates

| Resource Type | Billable Rate | Typical Usage |
|---------------|---------------|---------------|
| Consultant | $200/hour | Strategy, planning, advisory |
| Developer | $150/hour | Implementation, coding, technical |
| Project Manager | $250/hour | Coordination, oversight, delivery |

## Configuration Options

### Customer Count
Control how many customer records to create (1-10 recommended)

### Projects Per Customer  
Number of projects to assign to each customer (1-5 recommended)

### Time Entries Per Project
Amount of time tracking data to generate (10-100 entries)

### Utilization Rates
- Standard: 85% utilization
- Enterprise: 90% utilization  
- Consulting: 80% utilization

## Benefits

### 🚀 Rapid Demo Setup
- Create full demo environment in seconds
- No manual data entry required
- Consistent, professional-looking data

### 🎨 Realistic Scenarios
- Industry-appropriate company names and projects
- Believable budgets and timelines
- Proper resource allocation patterns

### 🔄 Repeatable Process
- Template-based approach ensures consistency
- Easy to recreate scenarios for different audiences
- Version control for scenario definitions

### 📈 Scalable Data Generation
- Generate small datasets for quick demos
- Create large datasets for stress testing
- Configurable complexity levels

## Integration

The Scenario Builder integrates seamlessly with existing NetSuite MCP tools:
- Uses `ns_createRecord` for customer and project creation
- Leverages `ns_runCustomSuiteQL` for data validation
- Works with existing caching mechanisms
- Maintains data consistency with NetSuite field requirements

## Future Enhancements

- **Custom Templates**: Allow users to define their own scenario templates
- **Data Persistence**: Save and reload scenario configurations  
- **Incremental Updates**: Add data to existing scenarios
- **Export/Import**: Share scenarios between environments
- **Analytics**: Track scenario usage and performance metrics